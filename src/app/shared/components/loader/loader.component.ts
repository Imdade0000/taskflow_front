// loader.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-overlay">
      <div class="loader-container">
        <!-- Cercle de chargement principal -->
        <div class="loader-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        
        <!-- Texte de chargement avec animation -->
        <div class="loader-text">
          <span class="loading-word">Chargement</span>
          <span class="loading-dots">
            <span class="dot dot-1">.</span>
            <span class="dot dot-2">.</span>
            <span class="dot dot-3">.</span>
          </span>
        </div>
        
        <!-- Barre de progression -->
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
    }

    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #ffffff;
      /* Alternative avec un très léger dégradé gris clair */
      /* background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); */
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-in-out;
    }

    .loader-container {
      text-align: center;
      animation: slideUp 0.5s ease-out;
    }

    .loader-spinner {
      position: relative;
      display: inline-block;
      width: 80px;
      height: 80px;
      margin-bottom: 30px;
    }

    .spinner-ring {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 4px solid transparent;
      border-top: 4px solid #4f46e5;
      border-radius: 50%;
      animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    .spinner-ring:nth-child(1) {
      animation-delay: -0.45s;
    }

    .spinner-ring:nth-child(2) {
      animation-delay: -0.3s;
      border-top-color: #6366f1;
    }

    .spinner-ring:nth-child(3) {
      animation-delay: -0.15s;
      border-top-color: #818cf8;
    }

    .spinner-ring:nth-child(4) {
      border-top-color: #a5b4fc;
    }

    .loader-text {
      color: #1f2937;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-word {
      margin-right: 5px;
      animation: pulse 2s ease-in-out infinite;
    }

    .loading-dots {
      display: flex;
    }

    .dot {
      font-size: 24px;
      animation: bounce 1.4s ease-in-out infinite;
    }

    .dot-1 {
      animation-delay: 0s;
    }

    .dot-2 {
      animation-delay: 0.2s;
    }

    .dot-3 {
      animation-delay: 0.4s;
    }

    .progress-bar {
      width: 200px;
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
      margin: 0 auto;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4f46e5, #6366f1, #4f46e5);
      background-size: 200% 100%;
      animation: progress 1.5s ease-in-out infinite;
    }

    /* Animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    @keyframes bounce {
      0%, 80%, 100% {
        transform: translateY(0);
        opacity: 0.5;
      }
      40% {
        transform: translateY(-10px);
        opacity: 1;
      }
    }

    @keyframes progress {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .loader-text {
        font-size: 20px;
      }
      
      .loader-spinner {
        width: 60px;
        height: 60px;
      }
      
      .progress-bar {
        width: 150px;
      }
    }
  `]
})
export class LoaderComponent {}