import { useState } from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    isPending?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export function ConfirmModal({ isOpen, title = "", message, isPending = false, onConfirm, onClose }: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="surface-card w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{message}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button 
                        className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                        onClick={onClose} 
                        disabled={isPending}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed" 
                        onClick={onConfirm} 
                        disabled={isPending}
                    >
                        {isPending ? "Processing..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
}