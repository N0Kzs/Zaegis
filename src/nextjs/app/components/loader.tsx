"use client";
import React from 'react';

interface LoaderProps {
  size?: number;
  color?: string;
}

const Loader = ({ size = 56, color = '#474bff' }: LoaderProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="shapes-loader">
        <style jsx>{`
          .shapes-loader {
            width: ${size}px;
            height: ${size * 0.866}px;
            position: relative;
            background: conic-gradient(from 120deg at 50% 64%, transparent, ${color} 1deg 120deg, transparent 121deg);
            transform-origin: 50% 50%;
            animation: shapes-main 1.5s infinite cubic-bezier(0.3, 1, 0, 1);
          }
          
          .shapes-loader:before,
          .shapes-loader:after {
            content: '';
            position: absolute;
            inset: 0;
            background: inherit;
            transform-origin: 50% 66%;
            animation: shapes-pseudo 1.5s infinite;
          }
          
          .shapes-loader:after {
            --s: -1;
          }
          
          .shapes-loader:before {
            --s: 1;
          }
          
          @keyframes shapes-main {
            0%, 30% {
              transform: rotate(0deg);
            }
            70% {
              transform: rotate(120deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          
          @keyframes shapes-pseudo {
            0% {
              transform: rotate(calc(var(--s, 1) * 120deg)) translate(0);
            }
            30%, 70% {
              transform: rotate(calc(var(--s, 1) * 120deg)) translate(calc(var(--s, 1) * -${size * 0.1}px), ${size * 0.2}px);
            }
            100% {
              transform: rotate(calc(var(--s, 1) * 120deg)) translate(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Loader;