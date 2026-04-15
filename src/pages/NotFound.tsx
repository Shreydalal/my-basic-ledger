import { Link } from "react-router-dom";
import { MoveLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-6 text-center animate-in fade-in duration-700">
            <div className="relative mb-8">
                <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
                <div className="relative p-6 bg-card rounded-2xl shadow-xl border border-border flex flex-col items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <AlertCircle className="h-12 w-12 text-primary" />
                    </div>
                </div>
            </div>
            
            <h1 className="text-6xl font-black tracking-tighter text-foreground mb-2">404</h1>
            <h2 className="text-2xl font-bold mb-4">Page not found</h2>
            <p className="max-w-md text-muted-foreground mb-8 text-lg font-medium">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            
            <Link to="/">
                <Button size="lg" className="gap-2 gradient-btn shadow-lg">
                    <MoveLeft className="h-4 w-4" />
                    Back to Dashboard
                </Button>
            </Link>
        </div>
    );
};

export default NotFound;
