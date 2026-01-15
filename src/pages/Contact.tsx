import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, Calendar, ArrowLeft } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/landing" className="text-2xl font-bold text-primary">
            MEOP
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/landing">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
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

      {/* Main Content */}
      <div className="pt-32 pb-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions? Want a demo? We'd love to hear from you.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-semibold mb-6">Our Team</h2>

              {/* Walker's Card */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-4 text-foreground">
                  Walker Bauknight
                </h3>
                <div className="space-y-3">
                  <a 
                    href="mailto:walkerbauknight125@gmail.com" 
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-5 w-5 text-primary" />
                    <span>walkerbauknight125@gmail.com</span>
                  </a>
                  <a 
                    href="tel:843-412-4009" 
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    <span>843-412-4009</span>
                  </a>
                </div>
              </Card>

              {/* Griffin's Card */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-xl font-semibold mb-4 text-foreground">
                  Griffin Bohmfalk
                </h3>
                <div className="space-y-3">
                  <a 
                    href="mailto:griffinbohmfalk@gmail.com" 
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-5 w-5 text-primary" />
                    <span>griffinbohmfalk@gmail.com</span>
                  </a>
                  <a 
                    href="tel:704-245-7593" 
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    <span>704-245-7593</span>
                  </a>
                </div>
              </Card>

              {/* Quick Contact Info */}
              <Card className="p-6 bg-muted/30 border-border">
                <div className="flex items-start gap-4">
                  <Calendar className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">
                      Prefer a call?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Book a meeting directly using the calendar on the right. 
                      We'll walk you through everything MEOP can do for you.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Cal.com Booking Widget */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h2 className="text-2xl font-semibold mb-6">Book a Meeting</h2>
              <Card className="bg-card border-border overflow-hidden">
                <div className="aspect-[4/5] min-h-[600px]">
                  <iframe
                    src="https://cal.com/walker-bauknight/meeting-with-walker?embed=true&theme=dark"
                    className="w-full h-full border-0"
                    title="Book a meeting with Walker"
                  />
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/landing" className="text-xl font-bold text-primary">
            MEOP
          </Link>
          <p className="text-sm text-muted-foreground">
            © 2025 MEOP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
