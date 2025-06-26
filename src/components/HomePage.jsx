/**
 * AIMCS HomePage - Refactored for reliable auth redirect and layout cleanup
 * Updated: 2025-06-26 - Direct authentication redirect implementation
 */
import React, { useEffect, useState, useRef } from 'react';
import { checkBackendHealth } from '../services/backendApi';

function SignInButton() {
  const handleSignIn = () => {
    console.log('=== DIRECT SIGN IN REDIRECT ===');
    
    // Direct redirect to the working authentication URL
    const authUrl = 'https://zimaxai.ciamlogin.com/zimaxai.onmicrosoft.com/oauth2/v2.0/authorize?client_id=a9ad55e2-d46f-4bad-bce6-c95f1bc43018&nonce=jxUVT19IIz&redirect_uri=https://aimcs.net/&scope=openid&response_type=id_token&prompt=login';
    
    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
  };
  
  return (
    <div className="flex flex-col space-y-2">
      <button 
        onClick={handleSignIn} 
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
      >
        Sign In
      </button>
      <button 
        onClick={() => {
          console.log('=== DEBUG INFO ===');
          console.log('Current URL:', window.location.href);
          console.log('User agent:', navigator.userAgent);
        }} 
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm"
      >
        Debug Info
      </button>
    </div>
  );
}

function UserInfo({ userInfo }) {
  if (!userInfo) return null;
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-700">Logged into <span className="font-semibold text-indigo-600">Zimax AI CIAM</span></span>
      <span className="text-xs text-gray-500">({userInfo.email || userInfo.preferred_username || 'N/A'})</span>
    </div>
  );
}

function SignOutButton() {
  const handleSignOut = () => {
    console.log('Signing out...');
    // Clear any stored authentication data
    window.location.href = 'https://aimcs.net/';
  };
  
  return (
    <button 
      onClick={handleSignOut} 
      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
    >
      Sign Out
    </button>
  );
}

function getIdTokenClaims(accounts) {
  if (!accounts || accounts.length === 0) return null;
  const idToken = accounts[0].idTokenClaims || accounts[0].idToken;
  if (!idToken) return null;
  // If idToken is a string, decode it
  let claims = idToken;
  if (typeof idToken === 'string') {
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      claims = JSON.parse(decodeURIComponent(escape(window.atob(base64))));
    } catch (e) {
      return null;
    }
  }
  return claims;
}

export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState({ loading: true, success: null, data: null });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Check for authentication on page load
  useEffect(() => {
    console.log('=== AUTHENTICATION CHECK ===');
    console.log('Current URL:', window.location.href);
    
    // Check if we have an ID token in the URL (after redirect from auth)
    const urlParams = new URLSearchParams(window.location.search);
    const idToken = urlParams.get('id_token');
    
    if (idToken) {
      console.log('ID token found in URL');
      try {
        // Decode the ID token to get user info
        const base64Url = idToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const claims = JSON.parse(decodeURIComponent(escape(window.atob(base64))));
        
        console.log('Decoded claims:', claims);
        setUserInfo(claims);
        setIsAuthenticated(true);
        
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error decoding ID token:', error);
      }
    } else {
      console.log('No ID token found, user not authenticated');
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    checkBackendHealth().then(result => {
      if (isMounted) setBackendStatus({ loading: false, success: result.success, data: result.data });
    }).catch(() => {
      if (isMounted) setBackendStatus({ loading: false, success: false, data: null });
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Top Bar: Auth + Diagnostics */}
      <header className="w-full bg-white/90 border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-2">
            <img src="/favicon.svg" alt="AIMCS Logo" className="h-8 w-8" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">AIMCS</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <UserInfo userInfo={userInfo} />
                  <SignOutButton />
                </>
              ) : (
                <SignInButton />
              )}
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded px-3 py-1 shadow-sm">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${backendStatus.loading ? 'bg-yellow-400 animate-pulse' : backendStatus.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-xs font-medium text-gray-700">
                  {backendStatus.loading && 'Checking backend...'}
                  {!backendStatus.loading && backendStatus.success && 'Backend: OK'}
                  {!backendStatus.loading && backendStatus.success === false && 'Backend: Error'}
                </span>
                {!backendStatus.loading && backendStatus.data && (
                  <span className="ml-1 text-xs text-gray-400">{backendStatus.data.service} v{backendStatus.data.version}</span>
                )}
              </div>
              {/* Show claims if signed in */}
              {userInfo && (
                <div className="mt-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1 shadow-sm">
                  <div><span className="font-semibold">email:</span> {userInfo.email || userInfo.emails?.[0] || 'N/A'}</div>
                  <div><span className="font-semibold">oid:</span> {userInfo.oid || 'N/A'}</div>
                  <div><span className="font-semibold">idp:</span> {userInfo.idp || 'N/A'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full pt-8 md:pt-12">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-indigo-50 to-white py-20 border-b border-indigo-100">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4">
              <span className="block">AI Multimodal</span>
              <span className="block text-indigo-600">Customer System</span>
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-500 md:mt-5 md:text-xl">
              Advanced AI-powered customer interaction platform featuring multimodal capabilities, secure authentication, and enterprise-grade scalability.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <a href="#demo" className="px-8 py-3 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-medium shadow transition">Try Demo</a>
              <a href="#learn-more" className="px-8 py-3 rounded-md text-indigo-600 bg-white hover:bg-gray-50 font-medium shadow border border-indigo-200 transition">Learn More</a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl font-extrabold text-gray-900">Enterprise-Grade AI Platform</p>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
                Built with cutting-edge technology and industry best practices for secure, scalable customer interactions.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <FeatureCard
                icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                title="Multimodal AI"
                description="Advanced AI models supporting text, voice, and visual interactions for comprehensive customer engagement."
              />
              <FeatureCard
                icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                title="Secure Authentication"
                description="Microsoft Entra External ID integration providing enterprise-grade security and user management."
              />
              <FeatureCard
                icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>}
                title="Scalable Architecture"
                description="Containerized microservices architecture deployed on Azure for optimal performance and scalability."
              />
              <FeatureCard
                icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                title="Analytics & Insights"
                description="Comprehensive monitoring and analytics to track performance, usage patterns, and customer interactions."
              />
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">About</h2>
              <p className="mt-2 text-3xl font-extrabold text-gray-900">Created by Zimax Networks</p>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">AI Architecture and Engineering Team</p>
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Our Mission</h3>
                <p className="mt-1 text-sm text-gray-500">Delivering cutting-edge AI solutions that transform customer experiences and drive business innovation.</p>
              </div>
              <dl className="divide-y divide-gray-200">
                <InfoRow label="Technology Stack" value="React 18, Node.js 20, Azure AI Foundry, Microsoft Entra ID, CosmosDB, Azure Container Apps" />
                <InfoRow label="Architecture" value="Microservices, Containerized, Cloud-Native, Event-Driven" />
                <InfoRow label="Security" value="OAuth 2.0, PKCE, Role-Based Access Control, End-to-End Encryption" />
              </dl>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 mt-8">
        <div className="max-w-7xl mx-auto py-8 px-4 text-center">
          <p className="text-base text-gray-400">© 2024 Zimax Networks. All rights reserved.</p>
          <p className="mt-2 text-sm text-gray-400">AI Multimodal Customer System - Enterprise AI Solutions</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 h-12 w-12 rounded-md bg-indigo-500 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <p className="text-lg font-medium text-gray-900">{title}</p>
        <p className="mt-2 text-base text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-4">
      <dt className="text-sm font-medium text-gray-500 col-span-1">{label}</dt>
      <dd className="text-sm text-gray-900 sm:col-span-2">{value}</dd>
    </div>
  );
} 