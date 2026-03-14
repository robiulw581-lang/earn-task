import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link,
  useLocation,
  useParams
} from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs, 
  doc, 
  updateDoc, 
  increment,
  addDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { userService, taskService, submissionService, transactionService } from './services';
import { UserProfile, UserRole, Task, Submission, Activity, Transaction } from './types';
import { 
  Home, 
  List, 
  PlusCircle, 
  User, 
  Wallet, 
  Users, 
  Trophy, 
  LogOut, 
  LayoutDashboard,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  MessageSquare,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const NoticeBanners = () => {
  const notices = [
    { id: 1, title: "New Feature", message: "Referral system is now live! Earn $0.10 per friend.", color: "bg-emerald-500", icon: <Users size={18} /> },
    { id: 2, title: "Security Alert", message: "Never share your password with anyone. Stay safe!", color: "bg-amber-500", icon: <ShieldCheck size={18} /> },
    { id: 3, title: "Daily Bonus", message: "Complete 5 tasks today to get an extra $0.05 bonus.", color: "bg-indigo-500", icon: <TrendingUp size={18} /> },
    { id: 4, title: "Support", message: "Need help? Our support team is available 24/7.", color: "bg-rose-500", icon: <MessageSquare size={18} /> },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 mb-8">
      {notices.map((notice) => (
        <motion.div 
          key={notice.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: notice.id * 0.1 }}
          className={`${notice.color} p-4 rounded-2xl text-white shadow-lg shadow-zinc-200/50 flex items-center gap-4`}
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            {notice.icon}
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest opacity-80">{notice.title}</h4>
            <p className="text-sm font-bold leading-tight">{notice.message}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"
    />
    <p className="text-zinc-500 font-medium animate-pulse">Loading TaskEarn...</p>
  </div>
);

const AuthPage = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('seller');
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await userService.createProfile({
          uid: userCredential.user.uid,
          email,
          displayName,
          role
        }, referralCode);
      }
      onAuthSuccess();
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled in the Firebase Console. Please enable it in the Authentication > Sign-in method tab.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 border border-zinc-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <TrendingUp className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">TaskEarn</h1>
          <p className="text-zinc-500">Marketplace for micro-tasks</p>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setIsLogin(true)}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
              isLogin ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Login
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
              !isLogin ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setRole('seller')}
                    className={cn(
                      "py-3 rounded-xl border text-sm font-medium transition-all",
                      role === 'seller' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-zinc-200 text-zinc-500"
                    )}
                  >
                    Seller (Worker)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={cn(
                      "py-3 rounded-xl border text-sm font-medium transition-all",
                      role === 'buyer' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-zinc-200 text-zinc-500"
                    )}
                  >
                    Buyer (Creator)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Referral Code (Optional)</label>
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="ABC123"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-200"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-400 font-bold">Or continue with</span></div>
          </div>

          <button 
            type="button"
            onClick={async () => {
              const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
              const provider = new GoogleAuthProvider();
              try {
                const result = await signInWithPopup(auth, provider);
                const profile = await userService.getProfile(result.user.uid);
                if (!profile) {
                  await userService.createProfile({
                    uid: result.user.uid,
                    email: result.user.email!,
                    displayName: result.user.displayName!,
                    role: 'seller' // Default to seller for social login
                  });
                }
                onAuthSuccess();
              } catch (err: any) {
                setError(err.message);
              }
            }}
            className="w-full bg-white border border-zinc-200 text-zinc-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Google Login
          </button>
        </form>
      </div>
    </div>
  );
};

const BottomNav = ({ role }: { role: UserRole }) => {
  const location = useLocation();
  const navItems = role === 'seller' ? [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Tasks', icon: List, path: '/tasks' },
    { label: 'Refer', icon: Users, path: '/refer' },
    { label: 'Profile', icon: User, path: '/profile' },
  ] : [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'My Tasks', icon: List, path: '/my-tasks' },
    { label: 'Create', icon: PlusCircle, path: '/create-task' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-3 flex justify-between items-center z-40 pb-safe">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              isActive ? "text-emerald-500" : "text-zinc-400"
            )}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        userService.subscribeToProfile(firebaseUser.uid, (profile) => {
          setUser(profile);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  if (!user) return <AuthPage onAuthSuccess={() => {}} />;

  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 pb-24">
        <Routes>
          <Route path="/" element={user.role === 'seller' ? <SellerHome user={user} /> : <BuyerDashboard user={user} />} />
          <Route path="/tasks" element={<TaskList user={user} />} />
          <Route path="/refer" element={<ReferralPage user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} />} />
          <Route path="/wallet" element={<WalletPage user={user} />} />
          
          {/* Buyer Routes */}
          <Route path="/my-tasks" element={<MyTasksPage user={user} />} />
          <Route path="/create-task" element={<CreateTaskPage user={user} />} />
          <Route path="/review/:taskId" element={<ReviewSubmissionsPage user={user} />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <BottomNav role={user.role} />
      </div>
    </Router>
  );
}

// --- Page Components (Stubs for now, will fill in) ---

const SellerHome = ({ user }: { user: UserProfile }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'activity'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(doc => doc.data() as Activity));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <p className="text-zinc-500 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold text-zinc-900">{user.displayName}</h2>
        </div>
        <Link to="/wallet" className="bg-white p-3 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-2">
          <Wallet className="text-emerald-500 w-5 h-5" />
          <span className="font-bold text-zinc-900">${user.balance.toFixed(2)}</span>
        </Link>
      </header>

      <NoticeBanners />

      <section className="bg-emerald-500 rounded-3xl p-6 text-white mb-8 shadow-xl shadow-emerald-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Current Level</p>
              <h3 className="text-4xl font-black">Level {user.level}</h3>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-emerald-400 flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="32" cy="32" r="28" 
                  fill="none" stroke="currentColor" strokeWidth="4" 
                  className="text-emerald-600"
                />
                <motion.circle 
                  cx="32" cy="32" r="28" 
                  fill="none" stroke="white" strokeWidth="4" 
                  strokeDasharray="176"
                  initial={{ strokeDashoffset: 176 }}
                  animate={{ strokeDashoffset: 176 - (176 * (user.exp % 100) / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <span className="text-xs font-bold">{user.exp % 100}%</span>
            </div>
          </div>
          <p className="text-emerald-100 text-sm">Complete {10 - (user.completedTasks % 10)} more tasks to reach Level {user.level + 1}</p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
      </section>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm">
          <CheckCircle className="text-emerald-500 mb-2" size={20} />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Completed</p>
          <p className="text-xl font-bold text-zinc-900">{user.completedTasks}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm">
          <AlertCircle className="text-red-500 mb-2" size={20} />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Success Rate</p>
          <p className="text-xl font-bold text-zinc-900">
            {user.completedTasks + user.rejectedTasks > 0 
              ? Math.round((user.completedTasks / (user.completedTasks + user.rejectedTasks)) * 100) 
              : 100}%
          </p>
        </div>
      </div>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-zinc-900">Live Activity</h3>
          <span className="text-xs text-emerald-500 font-bold animate-pulse">● LIVE</span>
        </div>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                <Users size={18} className="text-zinc-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-900 font-medium">{activity.message}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-center text-zinc-400 text-xs py-4">No recent activity</p>
          )}
        </div>
      </section>

    </div>
  );
};

const BuyerDashboard = ({ user }: { user: UserProfile }) => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'submissions'), where('buyerId', '==', user.uid), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleAutoApprove = async () => {
    const q = query(
      collection(db, 'submissions'), 
      where('buyerId', '==', user.uid), 
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    const now = new Date();
    let count = 0;

    for (const doc of snapshot.docs) {
      const sub = doc.data() as Submission;
      if (new Date(sub.autoApproveAt) <= now) {
        await submissionService.reviewSubmission(sub, 'approved');
        count++;
      }
    }
    alert(`Auto-approved ${count} expired submissions.`);
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <p className="text-zinc-500 text-sm">Buyer Dashboard</p>
          <h2 className="text-2xl font-bold text-zinc-900">{user.displayName}</h2>
        </div>
        <Link to="/wallet" className="bg-white p-3 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-2">
          <Wallet className="text-emerald-500 w-5 h-5" />
          <span className="font-bold text-zinc-900">${user.balance.toFixed(2)}</span>
        </Link>
      </header>

      <NoticeBanners />

      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl shadow-zinc-200">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Escrow Balance</p>
          <h3 className="text-4xl font-black mb-4">${user.escrowBalance.toFixed(2)}</h3>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: user.escrowBalance > 0 ? '65%' : '0%' }}
              className="h-full bg-emerald-500"
            />
          </div>
          <p className="text-zinc-500 text-xs mt-3">Funds currently locked in active tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm">
          <LayoutDashboard className="text-emerald-500 mb-2" size={20} />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Active Tasks</p>
          <p className="text-xl font-bold text-zinc-900">12</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm">
          <Clock className="text-amber-500 mb-2" size={20} />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Pending Review</p>
          <p className="text-xl font-bold text-zinc-900">{pendingCount}</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <button 
          onClick={handleAutoApprove}
          className="w-full mb-8 bg-amber-50 text-amber-700 p-4 rounded-2xl font-bold text-sm border border-amber-100 flex items-center justify-center gap-2"
        >
          <Clock size={18} />
          Auto-approve Expired Submissions
        </button>
      )}

      <section className="mb-8">
        <h3 className="font-bold text-zinc-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-3">
          <Link to="/create-task" className="bg-emerald-500 text-white p-4 rounded-2xl font-bold flex items-center justify-between shadow-lg shadow-emerald-100">
            <div className="flex items-center gap-3">
              <PlusCircle size={20} />
              <span>Create New Task</span>
            </div>
            <ChevronRight size={20} />
          </Link>
          <Link to="/my-tasks" className="bg-white text-zinc-900 p-4 rounded-2xl font-bold flex items-center justify-between border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3">
              <List size={20} className="text-emerald-500" />
              <span>Manage My Tasks</span>
            </div>
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
};

const TaskList = ({ user }: { user: UserProfile }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = taskService.subscribeToTasks(setTasks);
    setLoading(false);
    return () => unsubscribe();
  }, []);

  const handleSubmitProof = async () => {
    if (!selectedTask || !proofUrl) return;
    setSubmitting(true);
    try {
      await submissionService.submitTask({
        taskId: selectedTask.id,
        workerId: user.uid,
        buyerId: selectedTask.buyerId,
        proofUrl
      });
      setSelectedTask(null);
      setProofUrl('');
      alert('Proof submitted successfully! Awaiting review.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6">Available Tasks</h2>
      
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {['All', 'App Install', 'Telegram', 'Social', 'Website'].map(cat => (
          <button key={cat} className="px-4 py-2 bg-white border border-zinc-100 rounded-full text-xs font-bold whitespace-nowrap shadow-sm">
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {tasks.map(task => (
            <motion.div 
              key={task.id} 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -2 }}
              className={cn(
                "p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-all duration-300",
                task.isFeatured 
                  ? "bg-amber-50/40 border-amber-200 shadow-amber-100/50" 
                  : "bg-white border-zinc-100"
              )}
            >
              {task.isFeatured && (
                <div className="absolute top-0 right-0">
                  <div className="bg-amber-500 text-white text-[8px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                    <Trophy size={8} fill="currentColor" />
                    Featured
                  </div>
                </div>
              )}
              {task.currentWorkers >= task.maxWorkers && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 bg-emerald-500/5 backdrop-blur-[1px] flex items-center justify-center z-10"
                >
                  <motion.div 
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    className="bg-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-emerald-100"
                  >
                    <CheckCircle className="text-emerald-500" size={16} />
                    <span className="text-xs font-bold text-zinc-900">Task Completed</span>
                  </motion.div>
                </motion.div>
              )}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg">
                  {task.category.replace('_', ' ')}
                </span>
              </div>
              <p className="text-emerald-500 font-black text-lg">${task.reward.toFixed(2)}</p>
            </div>
            <h4 className="font-bold text-zinc-900 mb-1">{task.title}</h4>
            <p className="text-zinc-500 text-xs line-clamp-2 mb-4">{task.description}</p>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${(task.currentWorkers / task.maxWorkers) * 100}%` }} 
                  />
                </div>
                <span className="text-[10px] font-bold text-zinc-400">{task.currentWorkers}/{task.maxWorkers}</span>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTask(task)}
                className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Start Task
              </motion.button>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
        {tasks.length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto text-zinc-300 mb-4" size={48} />
            <p className="text-zinc-500 font-medium">No tasks available right now.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">Task Submission</h3>
                <button onClick={() => setSelectedTask(null)} className="text-zinc-400">
                  <AlertCircle size={24} />
                </button>
              </div>

              <div className="bg-zinc-50 p-4 rounded-2xl mb-6">
                <h4 className="font-bold text-zinc-900 mb-2">{selectedTask.title}</h4>
                <p className="text-sm text-zinc-600 mb-4">{selectedTask.description}</p>
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <CheckCircle size={16} />
                  <span>Reward: ${selectedTask.reward.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Proof Screenshot URL</label>
                  <input 
                    type="url" 
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://imgur.com/..."
                    required
                  />
                  <p className="text-[10px] text-zinc-400 mt-2">Upload your proof to a site like Imgur and paste the link here.</p>
                </div>

                <button 
                  onClick={handleSubmitProof}
                  disabled={submitting || !proofUrl}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Proof"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CreateTaskPage = ({ user }: { user: UserProfile }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState(0.10);
  const [maxWorkers, setMaxWorkers] = useState(10);
  const [category, setCategory] = useState<any>('app_install');
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await taskService.createTask({
        buyerId: user.uid,
        title,
        description,
        reward,
        maxWorkers,
        category,
        status: 'active',
        isFeatured
      });
      navigate('/my-tasks');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = (reward * maxWorkers) + (isFeatured ? 5 : 0);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6">Create New Task</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Task Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Join my Telegram channel"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="app_install">App Install</option>
              <option value="telegram">Telegram Join</option>
              <option value="website">Website Visit</option>
              <option value="social">Social Media Follow</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Description & Instructions</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-32"
              placeholder="Step 1: Click the link... Step 2: Take a screenshot..."
              required
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Reward per Worker</label>
              <input 
                type="number" 
                step="0.01"
                value={reward}
                onChange={(e) => setReward(parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Max Workers</label>
              <input 
                type="number" 
                value={maxWorkers}
                onChange={(e) => setMaxWorkers(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>
          
          <div 
            onClick={() => setIsFeatured(!isFeatured)}
            className={cn(
              "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between",
              isFeatured ? "border-amber-500 bg-amber-50" : "border-zinc-100 bg-zinc-50"
            )}
          >
            <div className="flex items-center gap-3">
              <Trophy className={isFeatured ? "text-amber-500" : "text-zinc-300"} />
              <div>
                <p className="text-sm font-bold text-zinc-900">Feature this task</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">+$5.00 fee</p>
              </div>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center",
              isFeatured ? "border-amber-500 bg-amber-500 text-white" : "border-zinc-300"
            )}>
              {isFeatured && <CheckCircle size={14} />}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-3xl text-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-400 font-bold uppercase text-xs">Total Cost</span>
            <span className="text-2xl font-black text-emerald-400">${totalCost.toFixed(2)}</span>
          </div>
          <button 
            type="submit"
            disabled={loading || user.balance < totalCost}
            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {loading ? "Creating..." : user.balance < totalCost ? "Insufficient Balance" : "Launch Task"}
          </button>
        </div>
      </form>
    </div>
  );
};

const WalletPage = ({ user }: { user: UserProfile }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Binance Pay');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = transactionService.subscribeToUserTransactions(user.uid, setTransactions);
    return () => unsubscribe();
  }, [user.uid]);

  const handleDeposit = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(10)
      });
      alert('Deposited $10.00 (Simulation)');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transactionService.requestWithdrawal(user.uid, parseFloat(amount), method, details);
      setShowWithdraw(false);
      setAmount('');
      setDetails('');
      alert('Withdrawal request submitted successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6">My Wallet</h2>
      
      <div className="bg-emerald-500 rounded-3xl p-8 text-white shadow-xl shadow-emerald-100 mb-8 text-center relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-2">Available Balance</p>
          <h3 className="text-5xl font-black mb-6">${user.balance.toFixed(2)}</h3>
          <div className="flex gap-3">
            <button onClick={handleDeposit} className="flex-1 bg-white text-emerald-600 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20">Deposit</button>
            <button onClick={() => setShowWithdraw(true)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-700/20">Withdraw</button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-zinc-900">Recent Transactions</h3>
          <Link to="/transactions" className="text-xs text-emerald-500 font-bold">View All</Link>
        </div>
        <div className="space-y-3">
          {transactions.map(tx => (
            <div key={tx.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  tx.type === 'withdrawal' ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500"
                )}>
                  {tx.type === 'withdrawal' ? <ArrowUpRight size={18} /> : <TrendingUp size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 capitalize">{tx.type.replace('_', ' ')}</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">
                    {new Date(tx.createdAt).toLocaleDateString()} • {tx.status}
                  </p>
                </div>
              </div>
              <p className={cn(
                "font-bold",
                tx.type === 'withdrawal' ? "text-amber-500" : "text-emerald-500"
              )}>
                {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount.toFixed(2)}
              </p>
              {tx.fee && (
                <p className="text-[10px] text-zinc-400 font-bold mt-1">Fee: ${tx.fee.toFixed(2)}</p>
              )}
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
              <p className="text-zinc-400 text-xs font-bold uppercase">No transactions yet</p>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">Withdraw Funds</h3>
                <button onClick={() => setShowWithdraw(false)} className="text-zinc-400">
                  <AlertCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Amount ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Min $1.00"
                    required
                  />
                  {amount && parseFloat(amount) >= 1 && (
                    <div className="mt-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                        <span>Platform Fee (1% or $0.50 min)</span>
                        <span className="text-red-400">-${Math.max(0.5, parseFloat(amount) * 0.01).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-zinc-900 uppercase">
                        <span>You will receive</span>
                        <span className="text-emerald-500">${Math.max(0, parseFloat(amount) - Math.max(0.5, parseFloat(amount) * 0.01)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Payment Method</label>
                  <select 
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Binance Pay">Binance Pay (Recommended)</option>
                    <option value="Payeer">Payeer</option>
                    <option value="Perfect Money">Perfect Money</option>
                    <option value="USDT (TRC20)">USDT (TRC20)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Payment Details (Email/ID/Address)</label>
                  <input 
                    type="text" 
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter your payment ID or address"
                    required
                  />
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4">
                  <p className="text-[10px] text-amber-700 font-bold uppercase leading-tight">
                    Withdrawals are processed within 24-48 hours. Please ensure your payment details are correct.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={loading || !amount || !details}
                  className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold shadow-lg shadow-zinc-200 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Submit Request"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ReferralPage = ({ user }: { user: UserProfile }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6">Refer & Earn</h2>
      
      <div className="bg-zinc-900 rounded-3xl p-8 text-white shadow-xl shadow-zinc-200 mb-8 text-center relative overflow-hidden">
        <Users className="mx-auto mb-4 text-emerald-500" size={48} />
        <h3 className="text-2xl font-black mb-2">Get $0.10 per Friend</h3>
        <p className="text-zinc-400 text-sm mb-6">Share your link and earn when your friends complete their first task.</p>
        
        <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700 flex items-center justify-between">
          <span className="font-mono text-emerald-400 font-bold">{user.referralCode}</span>
          <button className="text-xs font-bold uppercase text-white bg-emerald-500 px-3 py-1.5 rounded-lg">Copy</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm text-center">
          <p className="text-zinc-400 text-[10px] font-bold uppercase mb-1">Total Referrals</p>
          <p className="text-2xl font-black text-zinc-900">{user.referralCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm text-center">
          <p className="text-zinc-400 text-[10px] font-bold uppercase mb-1">Active Referrals</p>
          <p className="text-2xl font-black text-zinc-900">{user.activeReferrals || 0}</p>
        </div>
        <div className="col-span-2 bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm text-center">
          <p className="text-zinc-400 text-[10px] font-bold uppercase mb-1">Total Earned</p>
          <p className="text-2xl font-black text-emerald-500">${(user.referralEarnings || 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

const ProfilePage = ({ user }: { user: UserProfile }) => {
  const [showSupport, setShowSupport] = useState(false);

  return (
    <div className="p-6">
      <header className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-zinc-200 rounded-full mb-4 flex items-center justify-center relative">
          <User size={48} className="text-zinc-400" />
          <div className="absolute bottom-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-white">
            LVL {user.level}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">{user.displayName}</h2>
        <p className="text-zinc-500 text-sm">{user.email}</p>
        <span className="mt-2 px-3 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-black uppercase rounded-full">
          {user.role} Account
        </span>
      </header>

      <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm mb-6">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Referral Stats</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xl font-black text-zinc-900">{user.referralCount || 0}</p>
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Total</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-zinc-900">{user.activeReferrals || 0}</p>
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Active</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-emerald-500">${(user.referralEarnings || 0).toFixed(2)}</p>
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Earned</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button className="w-full bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between font-bold text-zinc-900">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-500" />
            <span>Account Security</span>
          </div>
          <ChevronRight size={20} className="text-zinc-300" />
        </button>
        <button 
          onClick={() => setShowSupport(true)}
          className="w-full bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between font-bold text-zinc-900"
        >
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-emerald-500" />
            <span>Customer Support</span>
          </div>
          <ChevronRight size={20} className="text-zinc-300" />
        </button>
        <button 
          onClick={() => signOut(auth)}
          className="w-full bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center justify-between font-bold text-red-600"
        >
          <div className="flex items-center gap-3">
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showSupport && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">Customer Support</h3>
                <button onClick={() => setShowSupport(false)} className="text-zinc-400">
                  <AlertCircle size={24} />
                </button>
              </div>
              <div className="space-y-3">
                <button className="w-full p-4 bg-zinc-50 rounded-xl text-left font-bold text-sm flex items-center justify-between">
                  <span>Live Support Chat</span>
                  <ChevronRight size={16} />
                </button>
                <button className="w-full p-4 bg-zinc-50 rounded-xl text-left font-bold text-sm flex items-center justify-between">
                  <span>Report a Problem</span>
                  <ChevronRight size={16} />
                </button>
                <button className="w-full p-4 bg-zinc-50 rounded-xl text-left font-bold text-sm flex items-center justify-between">
                  <span>Withdrawal Issue</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MyTasksPage = ({ user }: { user: UserProfile }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('buyerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => doc.data() as Task));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6">My Tasks</h2>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {tasks.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
            >
              <Link 
                to={`/review/${task.id}`}
                className={cn(
                  "block p-5 rounded-3xl border shadow-sm relative overflow-hidden",
                  task.isFeatured ? "bg-amber-50/40 border-amber-200" : "bg-white border-zinc-100"
                )}
              >
                {task.isFeatured && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-amber-500 text-white text-[8px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                      <Trophy size={8} fill="currentColor" />
                      Featured
                    </div>
                  </div>
                )}
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-zinc-900">{task.title}</h4>
              <span className={cn(
                "px-2 py-1 text-[10px] font-black uppercase rounded-lg",
                task.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
              )}>
                {task.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-zinc-500 text-xs">{task.currentWorkers}/{task.maxWorkers} Workers</p>
              <div className="flex items-center gap-1 text-emerald-500 font-bold text-sm">
                <span>Review Submissions</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </AnimatePresence>
        {tasks.length === 0 && !loading && (
          <div className="text-center py-12">
            <List className="mx-auto text-zinc-300 mb-4" size={48} />
            <p className="text-zinc-500 font-medium">You haven't created any tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ReviewSubmissionsPage = ({ user }: { user: UserProfile }) => {
  const { taskId } = useParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'submissions'), where('taskId', '==', taskId), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => doc.data() as Submission));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [taskId]);

  const handleReview = async (sub: Submission, status: 'approved' | 'rejected') => {
    try {
      await submissionService.reviewSubmission(sub, status);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6">Review Submissions</h2>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {submissions.map(sub => (
            <motion.div 
              key={sub.id} 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm"
            >
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-bold text-zinc-400 uppercase">Worker: {sub.workerId.substring(0, 8)}...</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase">{new Date(sub.submittedAt).toLocaleString()}</p>
            </div>
            
            <div className="aspect-video bg-zinc-100 rounded-2xl mb-4 overflow-hidden">
              <img 
                src={sub.proofUrl} 
                alt="Proof" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleReview(sub, 'rejected')}
                className="py-3 rounded-xl border border-red-100 text-red-600 font-bold text-sm hover:bg-red-50"
              >
                Reject
              </button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleReview(sub, 'approved')}
                className="py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600"
              >
                Approve
              </motion.button>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
        {submissions.length === 0 && !loading && (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto text-zinc-300 mb-4" size={48} />
            <p className="text-zinc-500 font-medium">No pending submissions to review.</p>
          </div>
        )}
      </div>
    </div>
  );
};
