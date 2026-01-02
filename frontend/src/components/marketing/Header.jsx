import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const navigation = {
    product: [
      { name: 'Time Tracking', href: '/time-tracking' },
      { name: 'Employee Monitoring', href: '/employee-monitoring' },
      { name: 'Timesheets & Approvals', href: '/timesheets' },
      { name: 'Workforce Management', href: '/workforce-management' },
      { name: 'Payroll & Billing', href: '/payroll' },
      { name: 'View All Features', href: '/features', highlight: true }
    ],
    solutions: [
      { name: 'Remote Teams', href: '/solutions/remote-teams' },
      { name: 'Productivity Improvement', href: '/solutions/productivity-improvement' },
      { name: 'Time Theft Prevention', href: '/solutions/time-theft-prevention' },
      { name: 'Payroll Automation', href: '/solutions/payroll-automation' },
      { name: 'Workforce Compliance', href: '/solutions/workforce-compliance' }
    ],
    industries: [
      { name: 'IT & Software', href: '/industries/software-development' },
      { name: 'Marketing Agencies', href: '/industries/marketing-agencies' },
      { name: 'BPO & Call Centers', href: '/industries/bpo-call-centers' },
      { name: 'Healthcare', href: '/industries/healthcare' },
      { name: 'Construction & Field Services', href: '/industries/construction' },
      { name: 'View All Industries', href: '/industries', highlight: true }
    ],
    resources: [
      { name: 'Blog', href: '/blog' },
      { name: 'Free Tools', href: '/tools' },
      { name: 'Help Center', href: '/help' },
      { name: 'Comparisons', href: '/compare' },
      { name: 'Case Studies', href: '/case-studies' }
    ]
  };

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">Working Tracker</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              <Dropdown
                label="Product"
                items={navigation.product}
                isOpen={openDropdown === 'product'}
                onToggle={() => toggleDropdown('product')}
              />
              <Dropdown
                label="Solutions"
                items={navigation.solutions}
                isOpen={openDropdown === 'solutions'}
                onToggle={() => toggleDropdown('solutions')}
              />
              <Dropdown
                label="Industries"
                items={navigation.industries}
                isOpen={openDropdown === 'industries'}
                onToggle={() => toggleDropdown('industries')}
              />
              <Link to="/integrations" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-50">
                Integrations
              </Link>
              <Link to="/pricing" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-50">
                Pricing
              </Link>
              <Dropdown
                label="Resources"
                items={navigation.resources}
                isOpen={openDropdown === 'resources'}
                onToggle={() => toggleDropdown('resources')}
              />
              <Link to="/contact" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-50">
                Contact
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900">
              Log In
            </Link>
            <Button asChild>
              <Link to="/signup">Start Free Trial</Link>
            </Button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-4">
            <MobileMenu navigation={navigation} onClose={() => setMobileMenuOpen(false)} />
          </div>
        )}
      </nav>
    </header>
  );
}

function Dropdown({ label, items, isOpen, onToggle }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-50"
      >
        {label}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
          {items.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onToggle}
              className={`block px-4 py-2 text-sm hover:bg-slate-50 ${
                item.highlight ? 'text-blue-600 font-semibold' : 'text-slate-700'
              }`}
            >
              {item.name}
              {item.highlight && ' →'}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ navigation, onClose }) {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="space-y-2">
      <MobileSection
        title="Product"
        items={navigation.product}
        isOpen={openSection === 'product'}
        onToggle={() => toggleSection('product')}
        onClose={onClose}
      />
      <MobileSection
        title="Solutions"
        items={navigation.solutions}
        isOpen={openSection === 'solutions'}
        onToggle={() => toggleSection('solutions')}
        onClose={onClose}
      />
      <MobileSection
        title="Industries"
        items={navigation.industries}
        isOpen={openSection === 'industries'}
        onToggle={() => toggleSection('industries')}
        onClose={onClose}
      />
      <Link to="/integrations" onClick={onClose} className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">
        Integrations
      </Link>
      <Link to="/pricing" onClick={onClose} className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">
        Pricing
      </Link>
      <MobileSection
        title="Resources"
        items={navigation.resources}
        isOpen={openSection === 'resources'}
        onToggle={() => toggleSection('resources')}
        onClose={onClose}
      />
      <Link to="/contact" onClick={onClose} className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">
        Contact
      </Link>
      <div className="pt-4 border-t border-slate-200 space-y-2">
        <Link to="/login" onClick={onClose} className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">
          Log In
        </Link>
        <Button asChild className="w-full">
          <Link to="/signup" onClick={onClose}>Start Free Trial</Link>
        </Button>
      </div>
    </div>
  );
}

function MobileSection({ title, items, isOpen, onToggle, onClose }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
      >
        {title}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pl-4 space-y-1 mt-1">
          {items.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`block px-4 py-2 text-sm hover:bg-slate-50 rounded-md ${
                item.highlight ? 'text-blue-600 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.name}
              {item.highlight && ' →'}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
