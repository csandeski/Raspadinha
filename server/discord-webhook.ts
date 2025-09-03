import { storage } from './storage';

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
}

async function sendDiscordNotification(webhookType: string, embed: DiscordEmbed): Promise<void> {
  try {
    const webhook = await storage.getDiscordWebhook(webhookType);
    if (!webhook || !webhook.webhookUrl) {
      console.log(`Discord webhook for ${webhookType} not configured or inactive`);
      return;
    }

    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(webhook.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
        username: 'Mania Brasil Bot',
      }),
    });

    if (!response.ok) {
      console.error(`Failed to send Discord notification for ${webhookType}:`, await response.text());
    } else {
      console.log(`Discord notification sent for ${webhookType}`);
    }
  } catch (error) {
    console.error(`Error sending Discord notification for ${webhookType}:`, error);
  }
}

export async function notifyNewUser(userData: {
  name: string;
  email: string;
  phone: string;
  referredBy?: string;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: '🎮 Novo Usuário Cadastrado',
    color: 0x00E880, // Verde
    fields: [
      {
        name: 'Nome',
        value: userData.name,
        inline: true,
      },
      {
        name: 'Email',
        value: userData.email,
        inline: true,
      },
      {
        name: 'Telefone',
        value: userData.phone,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Mania Brasil',
    },
  };

  if (userData.referredBy) {
    embed.fields?.push({
      name: 'Referido por',
      value: userData.referredBy,
      inline: true,
    });
  }

  await sendDiscordNotification('new_user', embed);
}

export async function notifyDepositPending(depositData: {
  userId: number;
  userName: string;
  amount: string;
  transactionId: string;
  paymentProvider: string;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: '⏳ Depósito Pendente',
    color: 0xFFB700, // Amarelo
    fields: [
      {
        name: 'Usuário',
        value: `${depositData.userName} (ID: ${depositData.userId})`,
        inline: true,
      },
      {
        name: 'Valor',
        value: `R$ ${depositData.amount}`,
        inline: true,
      },
      {
        name: 'Provedor',
        value: depositData.paymentProvider.toUpperCase(),
        inline: true,
      },
      {
        name: 'Transação',
        value: depositData.transactionId,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Mania Brasil',
    },
  };

  await sendDiscordNotification('deposit_pending', embed);
}

export async function notifyDepositPaid(depositData: {
  userId: number;
  userName: string;
  amount: string;
  transactionId: string;
  paymentProvider: string;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: '💰 Depósito Confirmado',
    color: 0x00FF00, // Verde claro
    fields: [
      {
        name: 'Usuário',
        value: `${depositData.userName} (ID: ${depositData.userId})`,
        inline: true,
      },
      {
        name: 'Valor',
        value: `R$ ${depositData.amount}`,
        inline: true,
      },
      {
        name: 'Provedor',
        value: depositData.paymentProvider.toUpperCase(),
        inline: true,
      },
      {
        name: 'Transação',
        value: depositData.transactionId,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Mania Brasil',
    },
  };

  await sendDiscordNotification('deposit_paid', embed);
}

export async function notifyWithdrawal(withdrawalData: {
  userId: number;
  userName: string;
  amount: string;
  pixKey: string;
  status: string;
}): Promise<void> {
  const statusColors: { [key: string]: number } = {
    'pending': 0xFFB700, // Amarelo
    'approved': 0x00FF00, // Verde
    'rejected': 0xFF0000, // Vermelho
  };

  const embed: DiscordEmbed = {
    title: '💸 Saque Realizado',
    color: statusColors[withdrawalData.status] || 0x808080,
    fields: [
      {
        name: 'Usuário',
        value: `${withdrawalData.userName} (ID: ${withdrawalData.userId})`,
        inline: true,
      },
      {
        name: 'Valor',
        value: `R$ ${withdrawalData.amount}`,
        inline: true,
      },
      {
        name: 'Status',
        value: withdrawalData.status === 'pending' ? 'Pendente' : 
               withdrawalData.status === 'approved' ? 'Aprovado' : 'Rejeitado',
        inline: true,
      },
      {
        name: 'Chave PIX',
        value: withdrawalData.pixKey,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Mania Brasil',
    },
  };

  await sendDiscordNotification('withdrawal', embed);
}

export async function notifySupportTicket(ticketData: {
  userId: number;
  userName: string;
  message: string;
  ticketId: number;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: '📩 Novo Ticket de Suporte',
    color: 0x00B4D8, // Azul
    fields: [
      {
        name: 'Usuário',
        value: `${ticketData.userName} (ID: ${ticketData.userId})`,
        inline: true,
      },
      {
        name: 'Ticket ID',
        value: `#${ticketData.ticketId}`,
        inline: true,
      },
      {
        name: 'Mensagem',
        value: ticketData.message.substring(0, 1000), // Limita a 1000 caracteres
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Mania Brasil',
    },
  };

  await sendDiscordNotification('support', embed);
}