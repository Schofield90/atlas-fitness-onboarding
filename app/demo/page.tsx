'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Clock,
  Zap,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Facebook,
  MessageSquare,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface DemoStage {
  id: string;
  duration: number | 'interactive';
  content: {
    title: string;
    subtitle?: string;
    visual: React.ReactNode;
    sound?: string;
    celebration?: boolean;
    cta?: {
      text: string;
      action: string;
      urgent?: string;
    };
  };
}

const DEMO_STAGES: DemoStage[] = [
  {
    id: 'intro',
    duration: 3000,
    content: {
      title: "Let's see what happens when someone clicks your Facebook ad...",
      visual: <FacebookAdMockup />,
      sound: 'notification'
    }
  },
  {
    id: 'lead_arrives',
    duration: 2000,
    content: {
      title: "New lead just submitted their details!",
      visual: <AnimatedLeadCard />,
      sound: 'whoosh'
    }
  },
  {
    id: 'timer_starts',
    duration: 5000,
    content: {
      title: "The clock is ticking...",
      subtitle: "Research shows: 78% of leads go with whoever responds first",
      visual: <CountdownTimer />
    }
  },
  {
    id: 'sms_composed',
    duration: 3000,
    content: {
      title: "Instant SMS being sent...",
      visual: <SMSComposer />,
      sound: 'typing'
    }
  },
  {
    id: 'sms_delivered',
    duration: 2000,
    content: {
      title: "SMS Delivered!",
      subtitle: "Response time: 1 minute 47 seconds ⚡",
      visual: <DeliveryConfirmation />
    }
  },
  {
    id: 'lead_responds',
    duration: 4000,
    content: {
      title: "Sarah just replied!",
      visual: <IncomingSMS />,
      sound: 'message_received',
      celebration: true
    }
  },
  {
    id: 'money_calculation',
    duration: 5000,
    content: {
      title: "Let's talk money...",
      visual: <MoneyCalculation />
    }
  },
  {
    id: 'monthly_impact',
    duration: 6000,
    content: {
      title: "Your monthly impact:",
      visual: <MonthlyProjection />,
      cta: {
        text: "Start Your 14-Day Free Trial",
        action: "/signup",
        urgent: "Get responding in under 5 minutes TODAY"
      }
    }
  }
];

export default function DemoPage() {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const stage = DEMO_STAGES[currentStage];

  useEffect(() => {
    if (isPlaying && stage.duration !== 'interactive') {
      const timer = setTimeout(() => {
        if (currentStage < DEMO_STAGES.length - 1) {
          setCurrentStage(currentStage + 1);
          setProgress(0);
        } else {
          setIsPlaying(false);
        }
      }, stage.duration);

      // Progress bar animation
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 100;
          return prev + (100 / (stage.duration as number)) * 100;
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        clearInterval(progressTimer);
      };
    }
  }, [currentStage, isPlaying, stage.duration]);

  const playSound = useCallback((sound: string) => {
    if (isMuted) return;
    // In a real app, you'd play actual sound files
    console.log(`Playing sound: ${sound}`);
  }, [isMuted]);

  useEffect(() => {
    if (stage.content.sound) {
      playSound(stage.content.sound);
    }
  }, [stage.content.sound, playSound]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentStage(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const nextStage = () => {
    if (currentStage < DEMO_STAGES.length - 1) {
      setCurrentStage(currentStage + 1);
      setProgress(0);
    }
  };

  const prevStage = () => {
    if (currentStage > 0) {
      setCurrentStage(currentStage - 1);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">The 5-Minute Magic</h1>
              <p className="text-blue-200">Watch how fast lead response transforms your gym revenue</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Stage */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* Stage Content */}
          <div className={`text-center mb-8 ${stage.content.celebration ? 'animate-pulse' : ''}`}>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              {stage.content.title}
            </h2>
            {stage.content.subtitle && (
              <p className="text-xl text-blue-200 mb-6">{stage.content.subtitle}</p>
            )}
          </div>

          {/* Visual Component */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            {stage.content.visual}
          </div>

          {/* CTA */}
          {stage.content.cta && (
            <div className="mt-8 text-center">
              <button
                onClick={() => router.push(stage.content.cta!.action)}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all transform hover:scale-105 shadow-lg"
              >
                {stage.content.cta.text}
              </button>
              {stage.content.cta.urgent && (
                <p className="text-yellow-300 mt-2 text-sm">{stage.content.cta.urgent}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-blue-200 mb-2">
              <span>Stage {currentStage + 1} of {DEMO_STAGES.length}</span>
              <span>{stage.id.replace('_', ' ')}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-100"
                style={{ width: `${(currentStage / (DEMO_STAGES.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={prevStage}
              disabled={currentStage === 0}
              className="p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="h-5 w-5 rotate-180" />
            </button>
            
            <button
              onClick={togglePlay}
              className="p-4 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
            
            <button
              onClick={nextStage}
              disabled={currentStage === DEMO_STAGES.length - 1}
              className="p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            
            <button
              onClick={restart}
              className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
    </div>
  );
}

// Visual Components
function FacebookAdMockup() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-4 text-black">
        <div className="flex items-center mb-3">
          <Facebook className="h-6 w-6 text-blue-600 mr-2" />
          <div>
            <p className="font-semibold">FitLife Gym</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
        <div className="w-full h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg mb-3 flex items-center justify-center text-white font-semibold">
          January Transformation Challenge
        </div>
        <h3 className="font-bold text-lg mb-2">January Transformation Challenge</h3>
        <p className="text-gray-600 text-sm mb-3">
          Join 100+ members who&apos;ve already transformed their bodies. Get your first month FREE!
        </p>
        <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Get Started Today
        </button>
      </div>
    </div>
  );
}

function AnimatedLeadCard() {
  return (
    <div className="max-w-md mx-auto transform animate-bounce">
      <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-6 text-white shadow-2xl">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="font-bold text-lg">New Lead!</h3>
            <p className="text-green-100">Just now</p>
          </div>
        </div>
        <div className="space-y-2">
          <p><strong>Name:</strong> Sarah Johnson</p>
          <p><strong>Phone:</strong> +44 7700 900123</p>
          <p><strong>Source:</strong> Facebook - January Challenge</p>
          <p><strong>Interest:</strong> Weight loss, fitness classes</p>
        </div>
      </div>
    </div>
  );
}

function CountdownTimer() {
  const [time, setTime] = useState(107); // 1:47 in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white mb-6">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-2" />
          <div className="text-2xl font-bold">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>
      <div className="text-xl text-orange-200">
        <p className="mb-2">⚠️ Lead getting cold...</p>
        <p className="text-sm">Every minute decreases conversion by 10%</p>
      </div>
    </div>
  );
}

function SMSComposer() {
  const [text, setText] = useState('');
  const fullMessage = "Hi Sarah! Thanks for your interest in our January Challenge! I'm Mike from FitLife Gym. When would be a good time for a quick chat about your fitness goals? We have some great new member offers ending soon 🎯";

  useEffect(() => {
    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex < fullMessage.length) {
        setText(fullMessage.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [fullMessage]);

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-4 text-black">
        <div className="flex items-center mb-4">
          <MessageSquare className="h-6 w-6 text-blue-600 mr-2" />
          <div>
            <p className="font-semibold">Composing SMS...</p>
            <p className="text-xs text-gray-500">To: Sarah Johnson</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 min-h-24 relative">
          <p className="text-sm">{text}</p>
          <div className="absolute bottom-2 right-2 w-1 h-4 bg-blue-600 animate-pulse" />
        </div>
        <div className="mt-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">{text.length}/160 characters</span>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliveryConfirmation() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-green-500 rounded-lg p-6 text-white text-center">
        <CheckCircle className="h-16 w-16 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2">Message Delivered!</h3>
        <div className="bg-white/20 rounded-lg p-4 mb-4">
          <p className="text-lg"><strong>Response time:</strong> 1 minute 47 seconds</p>
          <p className="text-sm text-green-100">That&apos;s 23x faster than industry average!</p>
        </div>
        <div className="flex items-center justify-center">
          <Zap className="h-5 w-5 mr-2" />
          <span>Lightning fast response</span>
        </div>
      </div>
    </div>
  );
}

function IncomingSMS() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-4 text-black">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="font-semibold">Sarah Johnson</p>
            <p className="text-xs text-gray-500">+44 7700 900123</p>
          </div>
        </div>
        {visible && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg animate-slide-in">
            <p className="text-sm">
              &quot;Hi Mike! Yes definitely interested! Can we chat tomorrow morning around 10am? 
              Really excited about the challenge! 💪&quot;
            </p>
            <p className="text-xs text-gray-500 mt-2">Just now</p>
          </div>
        )}
      </div>
      {visible && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center bg-green-500 text-white px-4 py-2 rounded-full">
            <CheckCircle className="h-4 w-4 mr-2" />
            <span className="font-semibold">LEAD ENGAGED! 🎉</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MoneyCalculation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 text-black">
        <div className="text-center mb-6">
          <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <h3 className="text-2xl font-bold">Revenue Impact</h3>
        </div>
        
        <div className="space-y-4">
          <div className={`flex justify-between items-center p-3 rounded-lg transition-all ${step >= 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
            <span>Without our system (8% conversion):</span>
            <span className="font-bold text-red-600">£48.00</span>
          </div>
          
          <div className={`flex justify-between items-center p-3 rounded-lg transition-all ${step >= 1 ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'}`}>
            <span>With 5-minute response (31% conversion):</span>
            <span className="font-bold text-green-600">£186.00</span>
          </div>
          
          {step >= 2 && (
            <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg border-2 border-green-300">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Additional revenue per lead:</span>
                <span className="text-2xl font-bold text-green-600">+£138.00</span>
              </div>
            </div>
          )}
          
          {step >= 3 && (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
              <p className="text-lg font-semibold text-yellow-800">
                That&apos;s £138 extra from ONE lead responding faster! 🚀
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthlyProjection() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 text-black">
        <div className="text-center mb-6">
          <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-2" />
          <h3 className="text-2xl font-bold">Monthly Revenue Impact</h3>
        </div>
        
        {visible && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Average Monthly Leads</p>
                <p className="text-2xl font-bold text-blue-600">47</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Additional Revenue</p>
                <p className="text-2xl font-bold text-green-600">£6,486</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span>Additional Revenue:</span>
                <span className="font-bold">£6,486</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span>System Cost:</span>
                <span className="font-bold">-£197</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Monthly Profit:</span>
                <span className="text-2xl font-bold text-green-600">£6,289</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-1">Return on Investment</p>
              <p className="text-3xl font-bold text-purple-600">3,092%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}