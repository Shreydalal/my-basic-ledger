import { useState } from "react";
import { Settings, LogOut, Lock, User, Info, ChevronRight, Loader2, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const { toast } = useToast();

    // Change password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // Logout state
    const [loggingOut, setLoggingOut] = useState(false);

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "Passwords don't match", description: "New password and confirmation do not match.", variant: "destructive" });
            return;
        }

        setChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Password updated", description: "Your password has been changed successfully." });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }
        } finally {
            setChangingPassword(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        await logout();
    };

    return (
        <div className="max-w-2xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Page header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Settings</h1>
                    <p className="text-muted-foreground text-sm font-medium mt-0.5">Manage your account and preferences.</p>
                </div>
            </div>

            {/* Account Info */}
            <section className="bg-card rounded-xl soft-inset shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                    <User className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-base">Account</h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Signed in as</p>
                            <p className="font-semibold text-foreground">{user?.email}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-bold text-base">
                                {user?.email?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div className="pt-1 text-xs text-muted-foreground">
                        User ID: <span className="font-mono select-all">{user?.id}</span>
                    </div>
                </div>
            </section>

            {/* Change Password */}
            <section className="bg-card rounded-xl soft-inset shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                    <Lock className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-base">Change Password</h2>
                </div>
                <div className="px-5 py-5 space-y-4">
                    <div className="space-y-1.5">
                        <Label>New Password</Label>
                        <div className="relative">
                            <Input
                                type={showPasswords ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Confirm New Password</Label>
                        <Input
                            type={showPasswords ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                        />
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-destructive font-medium">Passwords do not match.</p>
                    )}
                    <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword || !newPassword || !confirmPassword}
                        className="w-full gap-2"
                    >
                        {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        {changingPassword ? "Updating..." : "Update Password"}
                    </Button>
                </div>
            </section>

            {/* App Info */}
            <section className="bg-card rounded-xl soft-inset shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                    <Info className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-base">About</h2>
                </div>
                <div className="px-5 py-4 space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold">BookKeep — Navkar Hosiery</p>
                            <p className="text-muted-foreground text-xs">Business Ledger & Account Management</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Version</span>
                            <span className="font-medium text-foreground">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Platform</span>
                            <span className="font-medium text-foreground">Supabase + React</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Danger zone — Logout */}
            <section className="bg-card rounded-xl overflow-hidden border border-destructive/20 shadow-sm">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-destructive/10">
                    <LogOut className="h-4 w-4 text-destructive" />
                    <h2 className="font-semibold text-base text-destructive">Sign Out</h2>
                </div>
                <div className="px-5 py-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium">Log out of your account</p>
                        <p className="text-xs text-muted-foreground mt-0.5">You will be redirected to the login page.</p>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="shrink-0 gap-2"
                    >
                        {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                        {loggingOut ? "Signing out..." : "Sign Out"}
                    </Button>
                </div>
            </section>
        </div>
    );
}
