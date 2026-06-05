import * as React from 'react';

declare module '@base-ui/react/button' {
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
}

declare module '@base-ui/react/input' {
  export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
}

declare module '@base-ui/react/dialog' {
  export interface DialogRootProps {
    children?: React.ReactNode;
  }
  export interface DialogPortalProps {
    children?: React.ReactNode;
  }
  export interface DialogCloseProps {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }
  export interface DialogPopupProps extends React.HTMLAttributes<HTMLDivElement> {}
  export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
  export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
  export interface DialogTriggerProps<Payload = unknown> extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    render?: React.ReactElement;
  }
  export interface DialogBackdropProps extends React.HTMLAttributes<HTMLDivElement> {}
}

declare module '@base-ui/react/menu' {
  export interface MenuRootProps {
    children?: React.ReactNode;
  }
  export interface MenuPortalProps {
    children?: React.ReactNode;
  }
  export interface MenuPopupProps extends React.HTMLAttributes<HTMLDivElement> {}
  export interface MenuItemProps<Payload = unknown> extends React.HTMLAttributes<HTMLDivElement> {}
  export interface MenuTriggerProps<Payload = unknown> extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    render?: React.ReactElement;
  }
}
