import { Component, input, signal, output, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
// Pure component: no service injection

interface Message {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chatbot-container">
      <!-- Chat Button -->
      @if(!isOpen()) {
        <button 
          (click)="toggleChat()"
          class="chat-button"
          aria-label="Open chat"
        >
          <img src="chat.png" alt="Chat" class="chat-avatar" />
          @if(hasUnreadMessage()) {
            <span class="notification-badge"></span>
          }
        </button>
      }

      <!-- Chat Window -->
      @if(isOpen()) {
        <div class="chat-window">
          <!-- Header -->
          <div class="chat-header">
            <div class="flex items-center gap-3">
              <img src="chat.png" alt="Chat" class="header-avatar" />
              <div>
                <h3 class="font-semibold text-white">Datagov' hotline</h3>
                <p class="text-xs text-primary-100">We're here to help</p>
              </div>
            </div>
            <button 
              (click)="toggleChat()"
              class="close-button"
              aria-label="Close chat"
            >
              <i class="fa-solid fa-times"></i>
            </button>
          </div>

          <!-- Messages -->
          <div class="messages-container" #messagesContainer>
            @for(message of messages(); track message.timestamp) {
              <div 
                class="message"
                [class.bot-message]="message.isBot"
                [class.user-message]="!message.isBot"
              >
                @if(message.isBot) {
                  <img src="chat.png" alt="Bot" class="message-avatar" />
                }
                <div class="message-bubble">
                  <p [innerHTML]="message.text"></p>
                </div>
              </div>
            }
            
            @if(isTyping()) {
              <div class="message bot-message">
                <img src="chat.png" alt="Bot" class="message-avatar" />
                <div class="message-bubble typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            }
          </div>

          <!-- Input Area -->
          <div class="input-container">
            @if(sendingStatus() === 'success') {
              <div class="status-message success-message">
                <i class="fa-solid fa-check-circle"></i>
                Message sent! We'll get back to you soon.
              </div>
            }
            @if(sendingStatus() === 'error') {
              <div class="status-message error-message">
                <i class="fa-solid fa-exclamation-circle"></i>
                Failed to send. Please try again.
              </div>
            }
            
            <form (ngSubmit)="sendMessage()" class="input-form">
              <input
                type="text"
                [(ngModel)]="userInput"
                name="userInput"
                [placeholder]="getPlaceholder()"
                class="message-input"
                [disabled]="isSending() || sendingStatus() === 'success'"
                (keydown.enter)="sendMessage()"
              />
              <button
                type="submit"
                class="send-button"
                [disabled]="!userInput.trim() || isSending() || sendingStatus() === 'success'"
                aria-label="Send message"
              >
                @if(isSending()) {
                  <i class="fa-solid fa-spinner fa-spin"></i>
                } @else {
                  <i class="fa-solid fa-paper-plane"></i>
                }
              </button>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .chatbot-container {

      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .chat-button {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);
      transition: all 0.3s ease;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    }

    .chat-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(20, 184, 166, 0.5);
    }

    .chat-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
    }

    .notification-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid white;
      animation: bounce 1s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);
      }
      50% {
        box-shadow: 0 4px 20px rgba(20, 184, 166, 0.6);
      }
    }

    @keyframes bounce {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
    }

    .chat-window {
      width: 380px;
      height: 550px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .chat-header {
      background: linear-gradient(135deg,  var(--color-primary-400) 0%, var(--color-primary-600) 100%);
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
    }

    .header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .close-button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    .message {
      display: flex;
      gap: 8px;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .bot-message {
      align-items: flex-start;
    }

    .user-message {
      justify-content: flex-end;
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .message-bubble {
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 16px;
      line-height: 1.5;
      font-size: 14px;
    }

    .bot-message .message-bubble {
      background: white;
      color: #374151;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .user-message .message-bubble {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      animation: typing 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.7;
      }
      30% {
        transform: translateY(-10px);
        opacity: 1;
      }
    }

    .input-container {
      padding: 12px;
      background: white;
      border-top: 1px solid #e5e7eb;
    }

    .status-message {
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: fadeIn 0.3s ease-out;
    }

    .success-message {
      background: #d1fae5;
      color: #065f46;
    }

    .error-message {
      background: #fee2e2;
      color: #991b1b;
    }

    .input-form {
      display: flex;
      gap: 8px;
    }

    .message-input {
      flex: 1;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      
      outline: none;
      font-size: 16px;
      transition: all 0.2s;
    }

    .message-input:focus {
      border-color: var(--color-primary-500);
    }

    .message-input:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    .send-button {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
      border: none;
      border-radius: 12px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .send-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 4px 12px var(--color-primary-400);
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 640px) {
      .chatbot-container {
        bottom: 16px;
        left: 16px;
      }

      .chat-window {
        width: calc(100svw - 32px);
        height: calc(100svh - 32px);
        max-height: calc(100svh - 32px);
      }
    }
  `]
})
export class ChatbotComponent {

  email = input<string>('');
  introMessage = input<string>('👋 Hi there! <br/> You have a feedback or a question on the simulator ? Please let us know right here ...');
  sendEmail = output<FormData>();
  // External configuration and status inputs
  accessKey = input<string>('');
  subject = input<string>('Contact');
  fromName = input<string>('Chatbot Contact');
  submissionStatus = input<'idle' | 'success' | 'error'>('idle'); // Parent controls success/error
  successMessage = input<string>("✅ Thank you! Your message has been sent. We'll get back to you as soon as possible (if you provided your email) !");
  errorMessage = input<string>('Sorry, something went wrong. Please try again or email us directly at <strong>charlotte@maketools.ai</strong>');
  isOpen = signal(false);
  hasUnreadMessage = signal(true);
  userInput = '';
  userMessage = '';
  conversationStep = signal<'initial' | 'awaiting-message' | 'complete'>('initial');
  messages = signal<Message[]>([]);
  isTyping = signal(false);
  isSending = signal(false);
  sendingStatus = signal<'idle' | 'success' | 'error'>('idle');

  ngOnInit() {
    // Initial greeting when component loads
    this.addBotMessage(this.introMessage());
  }

  // React to external submission status changes (success/error provided by parent)
  statusEffect = effect(() => {
    const status = this.submissionStatus();
    // Only react when parent indicates a terminal state
    if (status === 'success') {
      this.isSending.set(false);
      this.sendingStatus.set('success');
      this.conversationStep.set('complete');
      this.addBotMessage(this.successMessage());
      // Reset after 5 seconds
      setTimeout(() => {
        this.resetChat();
      }, 5000);
    } else if (status === 'error') {
      this.isSending.set(false);
      this.sendingStatus.set('error');
      this.addBotMessage(this.errorMessage());
      // Allow retry after 3 seconds
      setTimeout(() => {
        this.sendingStatus.set('idle');
        this.conversationStep.set('awaiting-message');
      }, 3000);
    }
  });

  toggleChat() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      this.hasUnreadMessage.set(false);
      // Scroll to bottom after opening
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  getPlaceholder(): string {
    if (this.sendingStatus() === 'success') {
      return 'Thank you for your message!';
    }
    
    switch (this.conversationStep()) {
      case 'initial':
        return 'Type your message...';
      case 'awaiting-message':
        return 'Type your message...';
      default:
        return 'Type here...';
    }
  }

  async sendMessage() {
    if (!this.userInput.trim() || this.isSending() || this.sendingStatus() === 'success') {
      return;
    }

    const input = this.userInput.trim();
    this.userInput = '';

    // Add user message
    this.addUserMessage(input);

    // Process based on conversation step
    switch (this.conversationStep()) {
      case 'initial':
      case 'awaiting-message':
        await this.handleMessageInput(input);
        break;
    }
  }

  private async handleMessageInput(message: string) {
    this.userMessage = message;
    this.isSending.set(true);
    
    // Simulate a brief typing indicator for better UX
    this.showTypingIndicator();
    await this.delay(800);
    this.hideTypingIndicator();

    // Build the payload and let parent handle sending and errors
    const formData = new FormData();
    formData.append('message', this.userMessage);
    if (this.accessKey()) {
      formData.append('access_key', this.accessKey());
    }
    formData.append('subject', this.subject());
    formData.append('from_name', this.fromName());
    formData.append('email', this.email() || '');

    this.sendEmail.emit(formData);
    // Do not set success/error here. Parent will update `submissionStatus` input.
  }

  private addBotMessage(text: string) {
    this.messages.update(msgs => [...msgs, {
      text,
      isBot: true,
      timestamp: new Date()
    }]);
    this.scrollToBottom();
  }

  private addUserMessage(text: string) {
    this.messages.update(msgs => [...msgs, {
      text,
      isBot: false,
      timestamp: new Date()
    }]);
    this.scrollToBottom();
  }

  private showTypingIndicator() {
    this.isTyping.set(true);
    this.scrollToBottom();
  }

  private hideTypingIndicator() {
    this.isTyping.set(false);
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private resetChat() {
    this.messages.set([]);
    this.userMessage = '';
    this.conversationStep.set('initial');
    this.sendingStatus.set('idle');
    this.ngOnInit();
  }
}
