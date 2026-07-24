import { useApp } from "@/lib/app-context";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Bell, Check, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

// Định nghĩa kiểu dữ liệu cho Notification
interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type?: "SUCCESS" | "INFO" | "WARNING" | "ERROR";
    createdAt?: string;
    isRead?: boolean;
}

export function NotificationModal() {
    const { currentUser } = useApp();
    const queryClient = useQueryClient();
    const userId: string = currentUser?.id || "";
    
    // State lưu trữ danh sách thông báo và số lượng chưa đọc
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (userId === "") return;

        // Fetch existing notifications
        const fetchNotifications = async () => {
            try {
                const response = await api.get(`/notifications/${userId}`);
                const data: NotificationItem[] = response.data;
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.isRead).length);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };
        fetchNotifications();

        const token = localStorage.getItem("token") || "";
        const eventSource: EventSource = new EventSource(
            `http://localhost:8080/api/notifications/subscribe/${userId}?token=${token}`
        );

        eventSource.addEventListener('INIT', (event: MessageEvent): void => {
            console.log('INIT event received:', event.data);
        });

        eventSource.addEventListener('NOTIFICATION', (event: MessageEvent): void => {
            let newNotif: NotificationItem;
            try {
                // Nếu backend gửi về JSON Object
                newNotif = JSON.parse(event.data);
                // Đảm bảo có id để làm key
                if (!newNotif.id) newNotif.id = Date.now().toString();
            } catch (e) {
                // Đề phòng backend gửi về Plain Text
                newNotif = {
                    id: Date.now().toString(),
                    title: "Thông báo hệ thống",
                    message: event.data,
                    type: "INFO",
                    createdAt: new Date().toISOString(),
                    isRead: false
                };
            }

            // Thêm thông báo mới lên đầu danh sách
            setNotifications(prev => {
                // Avoid duplicates
                if (prev.find(n => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev];
            });
            setUnreadCount(prev => prev + 1);
        });

        eventSource.onerror = (error: Event): void => {
            console.error('EventSource error (auto-reconnecting):', error);
            // eventSource.close(); // Lỗi: gọi close() sẽ ngăn SSE tự động kết nối lại
        };

        eventSource.addEventListener('REFRESH_DATA', (event: MessageEvent): void => {
            try {
                const { resource } = JSON.parse(event.data) as { resource?: string };
                if (resource) {
                    queryClient.invalidateQueries({ queryKey: [resource] });
                }
            } catch {
                console.warn('Ignoring malformed refresh event:', event.data);
            }
        });

        return () => {
            eventSource.close();
        }
    }, [userId, queryClient]);

    // Hàm đánh dấu tất cả đã đọc
    const markAllAsRead = async () => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await api.patch(`/notifications/${userId}/read-all`);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const markAsRead = async (notifId: string) => {
        setNotifications(prev => prev.map(n => {
            if (n.id === notifId && !n.isRead) {
                setUnreadCount(c => Math.max(0, c - 1));
                return { ...n, isRead: true };
            }
            return n;
        }));
        try {
            await api.patch(`/notifications/${userId}/read/${notifId}`);
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };



    // Hàm chọn icon dựa theo type
    const getIcon = (type?: string) => {
        switch (type) {
            case "SUCCESS": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case "ERROR": return <AlertCircle className="h-5 w-5 text-red-500" />;
            case "WARNING": return <AlertCircle className="h-5 w-5 text-amber-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button className="size-10 rounded-lg bg-secondary border border-border grid place-items-center hover:bg-muted transition-colors relative">
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground ring-2 ring-background">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </SheetTrigger>
            <SheetContent className="w-100 sm:w-135 flex flex-col">
                <SheetHeader className="pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl">Thông báo</SheetTitle>
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 px-2 text-xs text-muted-foreground">
                                <Check className="mr-1 h-3 w-3" /> Đánh dấu đã đọc tất cả
                            </Button>
                        )}
                    </div>
                    <SheetDescription>
                        Cập nhật các thông tin mới nhất từ hệ thống kho.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6 py-4">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-2">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p>Chưa có thông báo nào</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    className={`p-4 border-b border-border hover:bg-muted/50 transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}
                                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                                    style={{ cursor: !notif.isRead ? 'pointer' : 'default' }}
                                >
                                    <div className="flex gap-4">
                                        <div className="mt-1">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium leading-none">
                                                    {notif.title}
                                                </p>
                                                {notif.createdAt && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {notif.message}
                                            </p>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}