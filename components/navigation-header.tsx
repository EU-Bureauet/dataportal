'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { EUBureauetLogo } from './eu-bureauet-logo.tsx';
import forsvarTheme from '@/data/themes/forsvar.json';
import miljoeTheme from '@/data/themes/miljoe.json';
import energiTheme from '@/data/themes/energi.json';

const navigationLinks = [
  { href: '/', label: 'Dataportal' },
  { href: '/latest-votes', label: 'Afstemninger' },
  { href: '/committee', label: 'Udvalg' },
  { href: '/meps', label: 'MEP\'er' },
  { href: '/compare-meps', label: 'Sammenlign MEP\'er' },
  { href: '/mep-disagreements', label: 'MEP uenigheder' },
  { href: '/compare-groups', label: 'Sammenlign grupper' },
  { href: '/group-wins', label: 'Gruppevindere' },
  { href: '/heatmap', label: 'Heatmap' },
  { href: '/winning-coalitions', label: 'Vindende koalitioner' },
  { href: '/national-party-disagreements', label: 'Partiuenigheder' },
];

const allThemeLinks = [
  { href: `/tema/${forsvarTheme.slug}`, label: forsvarTheme.title, published: forsvarTheme.published },
  { href: `/tema/${miljoeTheme.slug}`, label: miljoeTheme.title, published: miljoeTheme.published },
  { href: `/tema/${energiTheme.slug}`, label: energiTheme.title, published: energiTheme.published },
];

const themeLinks = allThemeLinks.filter((t) => t.published === true);

export function NavigationHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
          {/* Logo - left */}
          <Link 
            href="/" 
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
            title="Tilbage til forsiden"
          >
            <EUBureauetLogo />
          </Link>

          {/* Hamburger menu - right */}
          <button
            onClick={toggleMenu}
            className="flex flex-col justify-center items-center w-10 h-10 space-y-1.5 hover:bg-gray-100 rounded transition-colors"
            aria-label="Åbn menu"
            aria-expanded={isMenuOpen}
          >
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>

        {/* Slide-out menu - right */}
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/30 z-40 top-16 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={closeMenu}
            aria-hidden={!isMenuOpen}
          ></div>

          {/* Menu panel */}
          <nav
            className={`fixed top-16 right-0 w-64 max-w-xs bg-white shadow-lg z-40 max-h-[calc(100vh-4rem)] overflow-y-auto transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} ${isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            aria-hidden={!isMenuOpen}
          >
            <ul className="py-2">
              {navigationLinks.map((link, index) => (
                <Fragment key={link.href}>
                  <li>
                    <Link
                      href={link.href}
                      className="block px-6 py-3 text-gray-800 hover:bg-gray-100 transition-colors border-l-4 border-transparent hover:border-blue-500 hover:text-blue-600"
                      onClick={closeMenu}
                    >
                      {link.label}
                    </Link>
                  </li>
                  {index === 0 && themeLinks.length > 0 && (
                    <>
                      <li>
                        <span className="block px-6 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                          Temaer
                        </span>
                      </li>
                      {themeLinks.map((theme) => (
                        <li key={theme.href}>
                          <Link
                            href={theme.href}
                            className="block pl-10 pr-6 py-2 text-gray-700 hover:bg-gray-100 transition-colors border-l-4 border-transparent hover:border-blue-500 hover:text-blue-600 text-sm"
                            onClick={closeMenu}
                          >
                            {theme.label}
                          </Link>
                        </li>
                      ))}
                    </>
                  )}
                </Fragment>
              ))}
            </ul>
          </nav>
        </>
      </header>

      {/* Spacer to push content down */}
      <div className="h-16"></div>
    </>
  );
}
