import { useState, useCallback, useRef } from 'react';
import { askStreaming } from '../api';

export function useChat(sessionId) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [streamingTokens, setStreamingTokens] = useState('');
  const cancelRef = useRef(null);

  const sendMessage = useCallback(async (question) => {
    if (!question.trim() || isLoading) return;

    const userMsg = { role: 'user', content: question, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setCurrentStep('routing');
    setStreamingTokens('');

    const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));

    let resultData = null;
    let tokens = '';

    cancelRef.current = askStreaming({
      question,
      sessionId,
      chatHistory,
      onStep: (step) => setCurrentStep(step),
      onToken: (token) => {
        tokens += token;
        setStreamingTokens(tokens);
      },
      onResult: (result) => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: result.answer || tokens,
            citations: result.citations || [],
            keyPoints: result.key_points || [],
            stepLog: result.step_log || [],
            id: Date.now(),
          },
        ]);
        setIsLoading(false);
        setCurrentStep(null);
        setStreamingTokens('');
      },
      onError: (err) => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Error: ${err}`,
            id: Date.now(),
            isError: true,
          },
        ]);
        setIsLoading(false);
        setCurrentStep(null);
        setStreamingTokens('');
      },
    });

    // Safety timeout
    setTimeout(() => {
      if (isLoading) {
        if (tokens) {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: tokens, citations: [], id: Date.now() },
          ]);
        }
        setIsLoading(false);
        setCurrentStep(null);
        setStreamingTokens('');
      }
    }, 120000);

  }, [messages, isLoading, sessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingTokens('');
    setCurrentStep(null);
  }, []);

  const cancelStream = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      setIsLoading(false);
      setCurrentStep(null);
    }
  }, []);

  return { messages, isLoading, currentStep, streamingTokens, sendMessage, clearMessages, cancelStream };
}
