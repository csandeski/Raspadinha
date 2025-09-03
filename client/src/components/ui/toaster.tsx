import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={5000}>
      {toasts && toasts.map(function ({ id, title, description, ...props }) {
        // Use only description if available, otherwise title
        const message = description || title || "";
        
        return (
          <Toast key={id} {...props} className="bg-[#00E880] border-[#00E880]">
            <div className="flex items-center gap-2 flex-1">
              <ToastDescription className="text-black font-medium text-sm">
                {message}
              </ToastDescription>
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
