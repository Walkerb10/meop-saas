import { useCallback } from 'react';
import { format } from 'date-fns';

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ConversationGroup {
  conversation_id: string;
  messages: Message[];
  title?: string;
  lastTime: string;
}

export function useConversationExport() {
  const exportAsText = useCallback((conversation: ConversationGroup) => {
    const header = `Conversation: ${conversation.title || 'Untitled'}\n`;
    const date = `Date: ${format(new Date(conversation.lastTime), 'PPpp')}\n`;
    const separator = '─'.repeat(50) + '\n\n';

    const messages = conversation.messages.map(msg => {
      const time = format(new Date(msg.created_at), 'HH:mm');
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      return `[${time}] ${role}:\n${msg.content}\n`;
    }).join('\n');

    const content = header + date + separator + messages;
    
    downloadFile(content, `conversation-${conversation.conversation_id}.txt`, 'text/plain');
  }, []);

  const exportAsJSON = useCallback((conversation: ConversationGroup) => {
    const data = {
      id: conversation.conversation_id,
      title: conversation.title,
      exportedAt: new Date().toISOString(),
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
      })),
    };

    downloadFile(
      JSON.stringify(data, null, 2),
      `conversation-${conversation.conversation_id}.json`,
      'application/json'
    );
  }, []);

  const exportAsMarkdown = useCallback((conversation: ConversationGroup) => {
    const header = `# ${conversation.title || 'Conversation'}\n\n`;
    const date = `*Exported: ${format(new Date(), 'PPpp')}*\n\n---\n\n`;

    const messages = conversation.messages.map(msg => {
      const time = format(new Date(msg.created_at), 'HH:mm');
      const role = msg.role === 'user' ? '**You**' : '**Assistant**';
      return `### ${role} (${time})\n\n${msg.content}\n`;
    }).join('\n---\n\n');

    const content = header + date + messages;
    
    downloadFile(content, `conversation-${conversation.conversation_id}.md`, 'text/markdown');
  }, []);

  return {
    exportAsText,
    exportAsJSON,
    exportAsMarkdown,
  };
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
