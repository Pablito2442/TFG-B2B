import BrandPanel from "@/components/login/BrandPanel";
import LoginForm from "@/components/login/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <BrandPanel />
      <LoginForm />
    </div>
  );
}