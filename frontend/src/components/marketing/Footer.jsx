import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const footerLinks = {
    product: [
      { name: 'Time Tracking', href: '/time-tracking' },
      { name: 'Employee Monitoring', href: '/employee-monitoring' },
      { name: 'Timesheets', href: '/timesheets' },
      { name: 'Payroll', href: '/payroll' },
      { name: 'GPS Tracking', href: '/gps-time-tracking' },
      { name: 'Integrations', href: '/integrations' }
    ],
    solutions: [
      { name: 'Remote Teams', href: '/solutions/remote-teams' },
      { name: 'Time Theft Prevention', href: '/solutions/time-theft-prevention' },
      { name: 'Productivity Tracking', href: '/productivity-tracking' },
      { name: 'Workforce Compliance', href: '/solutions/workforce-compliance' },
      { name: 'Payroll Automation', href: '/solutions/payroll-automation' }
    ],
    industries: [
      { name: 'Software Development', href: '/industries/software-development' },
      { name: 'Marketing Agencies', href: '/industries/marketing-agencies' },
      { name: 'Call Centers', href: '/industries/bpo-call-centers' },
      { name: 'Construction', href: '/industries/construction' },
      { name: 'Healthcare', href: '/industries/healthcare' }
    ],
    resources: [
      { name: 'Blog', href: '/blog' },
      { name: 'Free Tools', href: '/tools' },
      { name: 'Help Center', href: '/help' },
      { name: 'Comparisons', href: '/compare' },
      { name: 'Case Studies', href: '/case-studies' }
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Security', href: '/security' },
      { name: 'Press Kit', href: '/press' },
      { name: 'Status', href: '/status' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms of Service', href: '/terms-of-service' },
      { name: 'GDPR Compliance', href: '/gdpr-compliance' },
      { name: 'Cookie Policy', href: '/cookie-policy' },
      { name: 'Refund Policy', href: '/refund-policy' }
    ],
    support: [
      { name: 'Contact', href: '/contact' },
      { name: 'Help Center', href: '/help' },
      { name: 'Status', href: '/status' },
      { name: 'API Docs', href: '/docs/api' }
    ]
  };

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-8 mb-12">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">Working Tracker</span>
            </Link>
            <p className="text-sm text-slate-400 mb-4">
              Complete employee monitoring and time tracking platform
            </p>
            <div className="flex gap-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </a>
            </div>
          </div>

          <FooterColumn title="Product" links={footerLinks.product} />
          <FooterColumn title="Solutions" links={footerLinks.solutions} />
          <FooterColumn title="Industries" links={footerLinks.industries} />
          <FooterColumn title="Resources" links={footerLinks.resources} />
          <FooterColumn title="Company" links={footerLinks.company} />
          <FooterColumn title="Legal" links={footerLinks.legal} />
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-400">
              © 2025 Working Tracker. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-1 bg-slate-800 rounded">🔒 SOC 2</span>
                <span className="px-2 py-1 bg-slate-800 rounded">GDPR</span>
                <span className="px-2 py-1 bg-slate-800 rounded">256-bit SSL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
