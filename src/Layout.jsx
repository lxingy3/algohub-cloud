import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Database, Menu, X } from "lucide-react";
import { useState } from 'react';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', page: 'Home' },
    { name: 'Algorithms', page: 'Algorithms' },
    { name: 'Stories', page: 'Stories' },
    { name: 'Community Events', page: 'CommunityEvents' },
    { name: 'About', page: 'About' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <img 
                src="/newlogo.png" 
                alt="AlgoStories Logo" 
                className="h-8"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)}>
                  <Button 
                    variant={currentPageName === item.page ? "secondary" : "ghost"}
                    size="sm"
                  >
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-2 space-y-1">
              {navItems.map(item => (
                <Link 
                  key={item.page} 
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button 
                    variant={currentPageName === item.page ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative overflow-hidden bg-gradient-to-r from-[#1a1404] via-[#2a1e07] to-[#050505] text-white py-8 mt-auto border-t border-yellow-400/20">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-yellow-300" />
                AlgoStories
              </h3>
              <p className="text-yellow-100/75 text-sm mt-1">Transparency in automated decision-making</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to={createPageUrl('Home')} className="text-yellow-100/75 hover:text-yellow-200 transition-colors text-sm">Home</Link>
              <Link to={createPageUrl('Algorithms')} className="text-yellow-100/75 hover:text-yellow-200 transition-colors text-sm">Algorithms</Link>
              <Link to={createPageUrl('Stories')} className="text-yellow-100/75 hover:text-yellow-200 transition-colors text-sm">Stories</Link>
              <Link to={createPageUrl('CommunityEvents')} className="text-yellow-100/75 hover:text-yellow-200 transition-colors text-sm">Community Events</Link>
              <Link to={createPageUrl('About')} className="text-yellow-100/75 hover:text-yellow-200 transition-colors text-sm">About</Link>
            </div>
          </div>
          <div className="relative mt-6 pt-6 border-t border-yellow-400/20 text-center text-yellow-100/55 text-sm">
            © {new Date().getFullYear()} AlgoStories. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}