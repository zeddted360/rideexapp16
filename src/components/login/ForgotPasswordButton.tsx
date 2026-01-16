// components/login/ForgotPasswordButton.tsx
import { Button } from "../ui/button";

interface ForgotPasswordButtonProps {
  onClick: () => void;
}

const ForgotPasswordButton = ({
  onClick,
}: ForgotPasswordButtonProps) => {
  return (
    <Button
      variant="link"
      onClick={onClick}
      className="text-orange-600 p-0 h-auto"
    >
      Forgot Password?
    </Button>
  );
};

export default ForgotPasswordButton;
