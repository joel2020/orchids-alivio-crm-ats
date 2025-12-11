'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Target,
  SquareCheckBig,
  FolderKanban,
  Briefcase,
  Users,
  FileStack,
  Calendar,
  Activity,
  Mail,
  Settings,
} from 'lucide-react';

export default function SidebarNavigation() {
  return (
    <div
      data-slot="sidebar-wrapper"
      className="group/sidebar-wrapper flex min-h-svh w-full text-[#333333]"
      style={
        {
          '--sidebar-width': '16rem',
          '--sidebar-width-icon': '3rem',
        } as React.CSSProperties
      }
    >
      <div
        className="group peer hidden md:block text-[#333333]"
        data-state="expanded"
        data-collapsible="icon"
        data-variant="sidebar"
        data-side="left"
        data-slot="sidebar"
      >
        <div className="relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180 group-data-[collapsible=icon]:w-[--sidebar-width-icon]" />
        <div className="fixed inset-y-0 left-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] group-data-[collapsible=icon]:w-[--sidebar-width-icon] border-r border-[#e5e5e5] bg-[#f5f5f5]">
          <div className="flex h-full w-full flex-col bg-[#f5f5f5] group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-[#e5e5e5] group-data-[variant=floating]:shadow-sm">
            
            {/* Sidebar Header */}
            <div
              className="flex flex-col gap-2 p-2 border-b border-[#e5e5e5] px-4 py-3"
              data-sidebar="header"
            >
              <Link className="flex items-center gap-2" href="#">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f2937] text-white font-bold text-sm">
                  A
                </div>
                <span className="font-semibold text-lg tracking-tight text-[#000000]">
                  Alivio
                </span>
              </Link>
            </div>

            {/* Sidebar Content */}
            <div
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2 group-data-[collapsible=icon]:overflow-hidden"
              data-sidebar="content"
            >
              {/* CRM Group */}
              <div className="relative flex w-full min-w-0 flex-col p-2">
                <div className="text-[#333333]/70 ring-[#000000] flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
                  CRM
                </div>
                <ul className="flex w-full min-w-0 flex-col gap-1">
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-[#f0f0f0] font-medium text-[#000000] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <Building2 className="size-4" />
                      <span>Clients</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <Target className="size-4" />
                      <span>Opportunities</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <SquareCheckBig className="size-4" />
                      <span>Tasks</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* ATS Group */}
              <div className="relative flex w-full min-w-0 flex-col p-2">
                <div className="text-[#333333]/70 ring-[#000000] flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
                  ATS
                </div>
                <ul className="flex w-full min-w-0 flex-col gap-1">
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <FolderKanban className="size-4" />
                      <span>Projects</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <Briefcase className="size-4" />
                      <span>Jobs</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <Users className="size-4" />
                      <span>Candidates</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <FileStack className="size-4" />
                      <span>Applications</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <Calendar className="size-4" />
                      <span>Interviews</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* System Group */}
              <div className="relative flex w-full min-w-0 flex-col p-2">
                <div className="text-[#333333]/70 ring-[#000000] flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
                  System
                </div>
                <ul className="flex w-full min-w-0 flex-col gap-1">
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <Activity className="size-4" />
                      <span>Activities</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <Mail className="size-4" />
                      <span>Instantly</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-[#000000] transition-[width,height,padding] focus-visible:ring-2 active:bg-[#f0f0f0] active:text-[#000000] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 bg-transparent text-[#333333] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-[#f0f0f0] hover:text-[#000000] h-8 text-sm"
                    >
                      <Settings className="size-4" />
                      <span>Settings</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}