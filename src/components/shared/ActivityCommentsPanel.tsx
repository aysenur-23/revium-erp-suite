import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Send, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

export interface Comment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  content: string;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string | null;
}

export interface Activity {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp | Date | string;
}

interface ActivityCommentsPanelProps {
  entityId: string;
  entityType: "order" | "product" | "customer" | "material" | "task" | "warranty";
  onAddComment: (content: string) => Promise<void>;
  onGetComments: () => Promise<Comment[]>;
  onGetActivities: () => Promise<Activity[]>;
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
}

const getInitials = (name?: string, email?: string): string => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
};

const getUserDisplayName = (userName?: string, userEmail?: string): string => {
  return userName || userEmail || "Bilinmeyen Kullanıcı";
};

const formatActivityDate = (date: Timestamp | Date | string): string => {
  try {
    let dateObj: Date;
    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === "string") {
      dateObj = new Date(date);
    } else {
      return "-";
    }
    
    if (isNaN(dateObj.getTime())) {
      return "-";
    }
    
    return format(dateObj, "d MMM yyyy HH:mm", { locale: tr });
  } catch {
    return "-";
  }
};

export const ActivityCommentsPanel = ({
  entityId,
  entityType,
  onAddComment,
  onGetComments,
  onGetActivities,
  currentUserId,
  currentUserName,
  currentUserEmail,
}: ActivityCommentsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [loading, setLoading] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchData();
    }
  }, [isOpen, entityId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [commentsData, activitiesData] = await Promise.all([
        onGetComments().catch(() => []),
        onGetActivities().catch(() => []),
      ]);
      setComments(commentsData);
      setActivities(activitiesData);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch data error:", error);
      }
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || !currentUserId) {
      toast.error("Yorum boş olamaz");
      return;
    }

    setSendingComment(true);
    try {
      await onAddComment(commentInput.trim());
      setCommentInput("");
      await fetchData();
      toast.success("Yorum eklendi");
      // Scroll to bottom
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Send comment error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage || "Yorum eklenemedi");
    } finally {
      setSendingComment(false);
    }
  };

  // Birleştirilmiş aktivite ve yorum listesi (tarihe göre sıralı)
  const combinedItems = [...activities, ...comments].sort((a, b) => {
    const aDate = a.createdAt instanceof Timestamp 
      ? a.createdAt.toDate() 
      : a.createdAt instanceof Date 
        ? a.createdAt 
        : new Date(a.createdAt);
    const bDate = b.createdAt instanceof Timestamp 
      ? b.createdAt.toDate() 
      : b.createdAt instanceof Date 
        ? b.createdAt 
        : new Date(b.createdAt);
    return bDate.getTime() - aDate.getTime();
  });

  return (
    <>
      {/* Chevron Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50 h-12 w-8 rounded-l-lg rounded-r-none border-r-0 shadow-lg",
          "bg-background hover:bg-muted transition-all duration-300",
          isOpen && "right-[320px] sm:right-[400px]"
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Paneli kapat" : "Paneli aç"}
      >
        {isOpen ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </Button>

      {/* Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-[320px] sm:w-[400px] bg-background border-l shadow-xl z-40",
            "flex flex-col transition-all duration-300 ease-in-out"
          )}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Yorumlar ve Etkinlik</h3>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : combinedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Henüz aktivite veya yorum yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {combinedItems.map((item) => {
                  const isComment = "content" in item;
                  const itemWithUser = item as Comment | Activity;
                  const userName = getUserDisplayName(
                    itemWithUser.userName,
                    itemWithUser.userEmail
                  );
                  const initials = getInitials(
                    itemWithUser.userName,
                    itemWithUser.userEmail
                  );
                  const date = formatActivityDate(item.createdAt);

                  return (
                    <div key={item.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">
                            {userName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {date}
                          </span>
                        </div>
                        {isComment ? (
                          <div className="bg-muted/50 rounded-lg p-2.5 text-sm text-foreground">
                            {(item as Comment).content}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {(item as Activity).description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t bg-muted/30">
            <div className="space-y-2">
              <Textarea
                placeholder="Yorum yaz..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                className="min-h-[80px] resize-none text-sm"
                disabled={sendingComment || !currentUserId}
              />
              <Button
                onClick={handleSendComment}
                disabled={sendingComment || !commentInput.trim() || !currentUserId}
                size="sm"
                className="w-full"
              >
                {sendingComment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Gönder
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

