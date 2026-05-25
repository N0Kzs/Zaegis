import { useState } from 'react';
import { Shield, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GeneratedCredentials {
  id: number;
  email: string;
  password: string;
}

interface CredentialsModalProps {
  credentials: GeneratedCredentials | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CredentialsModal({ credentials, open, onOpenChange }: CredentialsModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Shield className="w-5 h-5 text-green-600" />
            Credentials Generated
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Save these credentials now. The password will not be shown again.
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription className="text-yellow-800">
            <p className="font-semibold mb-1 text-sm">⚠️ Important: Save these credentials now!</p>
            <p className="text-xs">
              The password will not be shown again. You can reset it later if needed.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-id" className="text-sm font-medium text-foreground">
              User ID
            </Label>
            <div className="flex gap-2">
              <Input
                id="user-id"
                value={credentials?.id || ''}
                readOnly
                className="font-mono bg-muted/30 text-foreground/80"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(credentials?.id.toString() || '', 'id')}
                className="flex-shrink-0"
              >
                {copiedField === 'id' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email" className="text-sm font-medium text-foreground">
              Email Address
            </Label>
            <div className="flex gap-2">
              <Input
                id="user-email"
                value={credentials?.email || ''}
                readOnly
                className="bg-muted/30 text-foreground/80"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(credentials?.email || '', 'email')}
                className="flex-shrink-0"
              >
                {copiedField === 'email' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="flex gap-2">
              <Input
                id="user-password"
                type={showPassword ? 'text' : 'password'}
                value={credentials?.password || ''}
                readOnly
                className="font-mono bg-muted/30 text-foreground/80"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="flex-shrink-0"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(credentials?.password || '', 'password')}
                className="flex-shrink-0"
              >
                {copiedField === 'password' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}