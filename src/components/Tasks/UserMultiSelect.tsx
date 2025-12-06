import { useEffect, useMemo, useState } from "react";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, X, Users, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
}

interface UserMultiSelectProps {
  selectedUsers: string[];
  onSelectionChange: (users: string[]) => void;
  disabled?: boolean;
}

export const UserMultiSelect = ({ selectedUsers, onSelectionChange, disabled }: UserMultiSelectProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers(); 
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const userProfiles = await getAllUsers();
      
      const convertedUsers: User[] = userProfiles
        .filter((profile) => profile.id && (profile.fullName || profile.displayName || profile.email)) // Email varsa da kabul et
        .map((profile) => ({
          id: profile.id,
          full_name: profile.fullName || profile.displayName || profile.email || "İsimsiz Kullanıcı",
          email: profile.email || "",
          department_id: profile.departmentId || null,
        }));
      
      setUsers(convertedUsers);
    } catch (error) {
      const errorMessage = (error as Error).message || "Bilinmeyen hata";
      
      // Daha açıklayıcı hata mesajı
      if (errorMessage.includes("permission") || errorMessage.includes("permissions")) {
        const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
        showPermissionErrorToast("read", "user");
      } else if (errorMessage.includes("network") || errorMessage.includes("unavailable")) {
        toast.error("İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.");
      } else {
        toast.error("Kullanıcılar yüklenirken hata oluştu: " + errorMessage);
      }
      
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const text = searchTerm.trim().toLowerCase();
    return users.filter(
      (user) =>
        (user.full_name && user.full_name.toLowerCase().includes(text)) ||
        (user.email && user.email.toLowerCase().includes(text))
    );
  }, [users, searchTerm]);

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUsers, userId]);
    }
  };

  const removeUser = (userId: string) => {
    onSelectionChange(selectedUsers.filter(id => id !== userId));
  };

  const getSelectedUserNames = () => {
    if (!users || users.length === 0) return [];
    return users
      .filter(u => u && u.id && selectedUsers.includes(u.id))
      .map(u => u.full_name || "İsimsiz Kullanıcı");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={(newOpen) => !disabled && setOpen(newOpen)}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-11 border-2 hover:border-primary/50 transition-colors" 
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selectedUsers.length > 0
                  ? `${selectedUsers.length} kullanıcı seçildi`
                  : "Kullanıcı seçin"}
              </span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "transform rotate-180"
            )} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[90vw] sm:w-[400px] p-0 shadow-lg border-2" 
          side="bottom" 
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          collisionPadding={16}
          avoidCollisions={false}
        >
          <Command shouldFilter={false} className="rounded-lg">
            <div className="border-b px-3 py-2.5 bg-transparent">
              <CommandInput
                placeholder="Kullanıcı ara..."
                value={searchTerm}
                onValueChange={(value) => setSearchTerm(value)}
                className="border-0 focus:ring-0 bg-transparent"
              />
            </div>
            <CommandList 
              className="max-h-[300px] overflow-y-auto overflow-x-hidden scroll-smooth" 
              style={{ 
                height: 'var(--cmdk-list-height)', 
                maxHeight: '300px',
                scrollPaddingBlock: '10px'
              }}
            >
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {loading
                  ? "Yükleniyor..."
                  : filteredUsers.length === 0
                    ? searchTerm
                      ? "Arama sonucu bulunamadı."
                      : "Kullanıcı bulunamadı."
                    : "Arama sonucu bulunamadı."}
              </CommandEmpty>
              {!loading && filteredUsers.length > 0 && (
                <CommandGroup>
                  {filteredUsers.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.id}-${user.full_name}-${user.email}`}
                      onSelect={() => {
                        toggleUser(user.id);
                      }}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-md mx-1 my-0.5 transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        selectedUsers.includes(user.id) && "bg-primary/10"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border-2 shrink-0 pointer-events-none transition-all",
                          selectedUsers.includes(user.id)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-background"
                        )}
                      >
                        {selectedUsers.includes(user.id) && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <Avatar className="h-8 w-8 shrink-0 border-2 border-background shadow-sm">
                        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {loading && (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span className="ml-2">Yükleniyor...</span>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {getSelectedUserNames().map((name, index) => {
            const userId = selectedUsers[index];
            if (!userId) return null;
            return (
              <Badge 
                key={userId} 
                variant="secondary" 
                className="gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <span className="truncate max-w-[120px] sm:max-w-none">{name}</span>
                <X
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 rounded-full hover:bg-primary/20 p-0.5 transition-colors",
                    !disabled && "cursor-pointer"
                  )}
                  onClick={() => !disabled && removeUser(userId)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
