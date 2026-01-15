import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Mic, 
  Zap, 
  CheckCircle, 
  Bell, 
  Users, 
  Calendar, 
  MessageSquare,
  ArrowRight,
  Play
} from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">MEOP</div>
          <div className="flex items-center gap-4">
            <Link to="/contact">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Contact
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-primary">MEOP</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              say hello to the world's first
            </p>
            <p className="text-3xl md:text-4xl font-semibold text-foreground mb-8">
              <span className="text-primary">AVAI</span>{" "}
              <span className="text-muted-foreground text-lg md:text-xl">(agentic voice ai)</span>
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              The AI that doesn't just listen—it acts. Speak your problems, 
              and watch them disappear.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                  Start Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-border hover:bg-muted">
                  Book a Demo
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Animated Voice Orb */}
          <motion.div
            className="mt-16 flex justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <div className="w-24 h-24 rounded-full bg-primary/40 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <Mic className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <div className="absolute -inset-4 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why We Made This Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Why we made this
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Point 01 */}
              <Card className="p-8 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="text-5xl font-bold text-primary/30 mb-4">01</div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  it doesn't exist yet
                </h3>
                <p className="text-muted-foreground">
                  no voice ai can do work for you. Until now. We built what the 
                  industry has been promising but never delivered.
                </p>
              </Card>

              {/* Point 02 */}
              <Card className="p-8 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="text-5xl font-bold text-primary/30 mb-4">02</div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  our agent acts
                </h3>
                <p className="text-muted-foreground">
                  speak any problem, agents handle it. No more typing, clicking, 
                  or navigating complex interfaces.
                </p>
              </Card>

              {/* Point 03 */}
              <Card className="p-8 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="text-5xl font-bold text-primary/30 mb-4">03</div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  tasks made easy
                </h3>
                <p className="text-muted-foreground">
                  custom systems built, start to finish. Your unique workflows 
                  automated with just your voice.
                </p>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              What can MEOP do?
            </h2>
            <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
              From simple reminders to complex sales pipelines—all controlled by voice.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <Card className="p-6 bg-card border-border hover:bg-muted/50 transition-colors group">
                <Bell className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold mb-2 text-foreground">Reminders & Follow-ups</h3>
                <p className="text-sm text-muted-foreground">
                  Never forget a task. Set voice reminders that actually get done.
                </p>
              </Card>

              <Card className="p-6 bg-card border-border hover:bg-muted/50 transition-colors group">
                <Users className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold mb-2 text-foreground">CRM & Sales Pipelines</h3>
                <p className="text-sm text-muted-foreground">
                  Manage leads, update deals, and track progress with voice commands.
                </p>
              </Card>

              <Card className="p-6 bg-card border-border hover:bg-muted/50 transition-colors group">
                <Calendar className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold mb-2 text-foreground">Calendar Management</h3>
                <p className="text-sm text-muted-foreground">
                  Schedule meetings, block time, and organize your day hands-free.
                </p>
              </Card>

              <Card className="p-6 bg-card border-border hover:bg-muted/50 transition-colors group">
                <MessageSquare className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold mb-2 text-foreground">Automated Outreach</h3>
                <p className="text-sm text-muted-foreground">
                  Draft emails, send messages, and nurture relationships automatically.
                </p>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              See MEOP in action
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Watch how voice commands transform into real actions in seconds.
            </p>

            <div className="max-w-4xl mx-auto">
              <div className="aspect-video bg-card rounded-xl border border-border overflow-hidden relative group cursor-pointer">
                {/* Video placeholder - replace src with actual video */}
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-primary-foreground ml-1" />
                  </div>
                </div>
                <video 
                  className="w-full h-full object-cover"
                  poster=""
                  controls
                >
                  {/* Add your video source here */}
                  <source src="" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to let your voice do the work?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join the future of productivity. No more clicking through endless menus.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-border">
                  Talk to Us
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold text-primary">MEOP</div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Login
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 MEOP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
