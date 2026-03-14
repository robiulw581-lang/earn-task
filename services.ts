import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, Task, Submission, Transaction, Activity, UserRole } from './types';

// Error handling helper
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Services
export const userService = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as UserProfile : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  async createProfile(profile: Partial<UserProfile>, referralCode?: string) {
    try {
      const uid = profile.uid!;
      const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      let referredByUid = '';
      if (referralCode) {
        const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.toUpperCase()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          referredByUid = snap.docs[0].id;
          // Increment referrer's count
          await updateDoc(doc(db, 'users', referredByUid), {
            referralCount: increment(1),
            activeReferrals: increment(1) // Assuming they are active upon signup for now
          });
        }
      }

      await setDoc(doc(db, 'users', uid), {
        ...profile,
        balance: 0,
        escrowBalance: 0,
        level: 1,
        exp: 0,
        completedTasks: 0,
        rejectedTasks: 0,
        rating: 5,
        referralCode: myReferralCode,
        referredBy: referredByUid,
        referralCount: 0,
        activeReferrals: 0,
        referralEarnings: 0,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  },

  subscribeToProfile(uid: string, callback: (profile: UserProfile | null) => void) {
    return onSnapshot(doc(db, 'users', uid), (doc) => {
      if (doc.exists()) {
        callback(doc.data() as UserProfile);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    });
  }
};

// Task Services
export const taskService = {
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'currentWorkers'>) {
    try {
      const totalCost = task.reward * task.maxWorkers;
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', task.buyerId);
        const userSnap = await transaction.get(userRef);
        
        if (!userSnap.exists()) throw new Error('User not found');
        const userData = userSnap.data() as UserProfile;
        
        if (userData.balance < totalCost) throw new Error('Insufficient balance');
        
        // Lock funds in escrow
        transaction.update(userRef, {
          balance: increment(-totalCost),
          escrowBalance: increment(totalCost)
        });
        
        const newTaskRef = doc(collection(db, 'tasks'));
        transaction.set(newTaskRef, {
          ...task,
          id: newTaskRef.id,
          currentWorkers: 0,
          createdAt: new Date().toISOString()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tasks');
    }
  },

  subscribeToTasks(callback: (tasks: Task[]) => void) {
    const q = query(collection(db, 'tasks'), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Task));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });
  }
};

// Submission Services
export const submissionService = {
  async submitTask(submission: Omit<Submission, 'id' | 'status' | 'submittedAt' | 'autoApproveAt'>) {
    try {
      // Fraud Detection: Check for duplicate submissions by same worker for same task
      const q = query(
        collection(db, 'submissions'), 
        where('taskId', '==', submission.taskId), 
        where('workerId', '==', submission.workerId)
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        throw new Error('You have already submitted proof for this task.');
      }

      const subRef = doc(collection(db, 'submissions'));
      const autoApproveAt = new Date();
      autoApproveAt.setHours(autoApproveAt.getHours() + 24);

      await setDoc(subRef, {
        ...submission,
        id: subRef.id,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        autoApproveAt: autoApproveAt.toISOString()
      });

      // Add to live activity
      await addDoc(collection(db, 'activity'), {
        type: 'submission',
        message: `A worker just completed a task!`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'submissions');
    }
  },

  async reviewSubmission(submission: Submission, status: 'approved' | 'rejected') {
    try {
      await runTransaction(db, async (transaction) => {
        const subRef = doc(db, 'submissions', submission.id);
        const taskRef = doc(db, 'tasks', submission.taskId);
        const workerRef = doc(db, 'users', submission.workerId);
        const buyerRef = doc(db, 'users', submission.buyerId);

        const taskSnap = await transaction.get(taskRef);
        const taskData = taskSnap.data() as Task;

        if (status === 'approved') {
          // Release escrow to worker
          transaction.update(workerRef, {
            balance: increment(taskData.reward),
            completedTasks: increment(1),
            exp: increment(10)
          });
          transaction.update(buyerRef, {
            escrowBalance: increment(-taskData.reward)
          });
          transaction.update(taskRef, {
            currentWorkers: increment(1)
          });
        } else {
          // Return escrow to buyer balance
          transaction.update(buyerRef, {
            balance: increment(taskData.reward),
            escrowBalance: increment(-taskData.reward)
          });
          transaction.update(workerRef, {
            rejectedTasks: increment(1)
          });
        }

        transaction.update(subRef, {
          status,
          reviewedAt: new Date().toISOString()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
  }
};

// Transaction Services
export const transactionService = {
  async requestWithdrawal(userId: string, amount: number, paymentMethod: string, paymentDetails: string) {
    try {
      if (amount < 1) throw new Error('Minimum withdrawal is $1.00');

      const fee = Math.max(0.5, amount * 0.01);

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) throw new Error('User not found');
        const userData = userSnap.data() as UserProfile;

        if (userData.balance < amount) throw new Error('Insufficient balance');

        // Deduct balance immediately (full amount including fee)
        transaction.update(userRef, {
          balance: increment(-amount)
        });

        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          id: transRef.id,
          userId,
          amount,
          fee,
          type: 'withdrawal',
          status: 'pending',
          paymentMethod,
          paymentDetails,
          createdAt: new Date().toISOString()
        });

        // Add to live activity
        const activityRef = doc(collection(db, 'activity'));
        transaction.set(activityRef, {
          id: activityRef.id,
          type: 'withdrawal',
          message: `A user requested a withdrawal of $${amount.toFixed(2)} (Fee: $${fee.toFixed(2)})`,
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  },

  subscribeToUserTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    const q = query(
      collection(db, 'transactions'), 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Transaction));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });
  }
};
