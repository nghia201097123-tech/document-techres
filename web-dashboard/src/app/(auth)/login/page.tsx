"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store, User, Lock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth-service";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, isAuthenticated, isHydrated } = useAuthStore();

  const [tenantId, setTenantId] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isHydrated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantId.trim() || !username.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin đăng nhập",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({
        tenantId: tenantId.trim().toUpperCase(),
        username: username.trim(),
        password,
      });

      login(response.staff, response.company, response.token);

      toast({
        title: "Đăng nhập thành công",
        description: `Chào mừng ${response.staff.name}!`,
      });

      router.push("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        variant: "destructive",
        title: "Đăng nhập thất bại",
        description: err.response?.data?.message || "Thông tin đăng nhập không chính xác",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">TechRes Dashboard</CardTitle>
        <CardDescription>
          Đăng nhập để quản lý nhà hàng của bạn
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantId">Mã công ty (Tiên định danh)</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="tenantId"
                placeholder="VD: CTAF"
                className="pl-10 uppercase"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value.toUpperCase())}
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mã công ty được cấp khi đăng ký
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="VD: admin hoặc ctaf_001"
                className="pl-10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
              <a
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Quên mật khẩu?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đăng nhập
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Liên hệ quản trị viên nếu bạn chưa có tài khoản
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
