"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"

function DropdownMenu({ children, ...props }: MenuPrimitive.Root.Props & { children?: React.ReactNode }) {
  return <MenuPrimitive.Root {...props}>{children}</MenuPrimitive.Root>
}

function DropdownMenuTrigger({
  children,
  asChild,
  render,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean
  render?: React.ReactElement
}) {
  if (asChild && React.isValidElement(children)) {
    return (
      <MenuPrimitive.Trigger
        data-slot="dropdown-menu-trigger"
        render={children}
        {...props}
      />
    )
  }
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      render={render}
      {...props}
    >
      {children}
    </MenuPrimitive.Trigger>
  )
}

function DropdownMenuPortal({ children, ...props }: MenuPrimitive.Portal.Props & { children?: React.ReactNode }) {
  return <MenuPrimitive.Portal {...props}>{children}</MenuPrimitive.Portal>
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "start",
  side = "bottom",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { 
  sideOffset?: number; 
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <DropdownMenuPortal>
      {/* @ts-ignore */}
      <MenuPrimitive.Positioner className="z-[9999]" sideOffset={sideOffset} align={align} side={side}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-[9999] transform-gpu isolate min-w-[8rem] overflow-hidden rounded-md border bg-popover border-border p-1 text-popover-foreground shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </DropdownMenuPortal>
  )
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}

