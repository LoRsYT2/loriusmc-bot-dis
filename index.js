
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');

const CONFIG = {
  GUILD_ID: '1392728471222091920',
  STAFF_ROLE_ID: '1392856632819712041',
  TICKET_PANEL_CHANNEL_ID: '1411070011992178818',
  TICKET_TYPES: {
    general: {
      label: '🔍 General Support',
      description: 'Open to receive general support',
      categoryId: '1434173955392012328',
      emoji: '🔍'
    },
    bug: {
      label: '🐞 Bug Report',
      description: 'Open to report a bug',
      categoryId: '1434174066537005066',
      emoji: '🐞'
    },
    player: {
      label: '🔨 Player Report',
      description: 'Open to report a player',
      categoryId: '1434174152440545461',
      emoji: '🔨'
    },
    purchase: {
      label: '🛒 Purchase Support',
      description: 'Open to receive purchase support',
      categoryId: '1434174186947084308',
      emoji: '🛒'
    },
    password: {
      label: '🔑 Password Reset',
      description: 'Open to receive password reset support',
      categoryId: '1434176747955290114',
      emoji: '🔑'
    }
  },
  TICKET_PREFIX: 'ticket',
  LOG_CHANNEL_ID: null
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(CONFIG.GUILD_ID).catch(() => null);
  if (!guild) return console.error('❌ السيرفر غير موجود.');

  const panelChannel = guild.channels.cache.get(CONFIG.TICKET_PANEL_CHANNEL_ID);
  if (!panelChannel) return console.error('❌ لم أجد روم اللوحة.');

  try {
    const fetched = await panelChannel.messages.fetch({ limit: 10 });
    const existing = fetched.find(m => m.author.id === client.user.id && m.components.length > 0);
    if (!existing) {
      await sendTicketPanel(panelChannel);
      console.log('🎟️ تم إرسال لوحة التذاكر.');
    } else {
      console.log('🎟️ لوحة التذاكر موجودة مسبقًا.');
    }
  } catch (e) {
    console.error('⚠️ خطأ أثناء إرسال اللوحة:', e);
  }
});

async function sendTicketPanel(channel) {
  const options = Object.entries(CONFIG.TICKET_TYPES).map(([key, val]) => ({
    label: val.label,
    description: val.description,
    value: key,
    emoji: val.emoji
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('Select a ticket type')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  const embed = new EmbedBuilder()
    .setTitle('🎟️ | Select a ticket type')
    .setDescription('🎫 الدعم العام\n\nإذا كنت تريد إنشاء تذكرة، اضغط على القائمة أسفل هذه الرسالة.\n\n⏱️ زمن الاستجابة\nنحن نسعى دائمًا للحفاظ على زمن استجابة قصير لتذاكرنا. ومع ذلك، يرجى تذكّر أننا لسنا روبوتات، لذا نرجو منك الصبر أثناء معالجة تذاكر الآخرين. ستتلقى ردًا في أقرب وقت ممكن.\n\n📝 تقديم المعلومات\nعند فتح تذكرة، يرجى تجنب إرسال تحية فقط مثل مرحبًا أو أهلاً ثم الانصراف. بدلاً من ذلك، اشرح مشكلتك بوضوح في رسالة مكتوبة بشكل جيد.\n\n⚠️ التذاكر في الفئة الخطأ\nيرجى التأكد من فتح تذكرتك في الفئة الصحيحة. إذا تم فتح تذكرة في الفئة الخاطئة، فسيتم إغلاقها دون رد، وسيتعين عليك إعادة فتحها في الفئة الصحيحة.\n\nهذا يساعدنا على معالجة الطلبات بشكل أسرع والحفاظ على تنظيم الدعم.')
    .setColor('#2b2d31');

  await channel.send({ embeds: [embed], components: [row] });
}

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
      const selected = interaction.values[0];
      const type = CONFIG.TICKET_TYPES[selected];
      if (!type) return interaction.reply({ content: '❌ نوع التذكرة غير معروف.', ephemeral: true });

      const guild = interaction.guild;
      const member = interaction.member;

      const existingTicket = guild.channels.cache.find(
        c =>
          c.name.includes(member.user.username.toLowerCase()) &&
          c.permissionsFor(member.id)?.has(PermissionFlagsBits.ViewChannel)
      );

      if (existingTicket) {
        return interaction.reply({
          content: `⚠️ لديك تذكرة مفتوحة بالفعل هنا: ${existingTicket}\nيرجى إغلاقها قبل فتح أخرى.`,
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const baseName = `${CONFIG.TICKET_PREFIX}-${member.user.username.toLowerCase().replace(/[^a-z0-9\-]/gi, '')}`;
      const existing = guild.channels.cache.filter(c => c.name?.startsWith(baseName));
      const channelName = `${type.emoji}・${selected}-${existing.size + 1}`;

      const categoryId = type.categoryId;
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId || undefined,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: member.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: CONFIG.STAFF_ROLE_ID,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          }
        ]
      });

      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('إغلاق التذكرة')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const row = new ActionRowBuilder().addComponents(closeButton);

      const embed = new EmbedBuilder()
        .setTitle(`${type.label}`)
        .setDescription(`مرحبًا ${member}, الرجاء كتابة مشكلتك بالتفصيل هنا.\nسيتم الرد عليك في أقرب وقت ممكن.`)
        .setColor('#5865f2');

      await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
      await interaction.editReply({ content: `✅ تم إنشاء التذكرة بنجاح: ${channel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'ticket_close') {
      const channel = interaction.channel;
      await interaction.reply({ content: '🕒 سيتم حذف التذكرة بعد 5 ثوانٍ...', ephemeral: true });
      await channel.setName(`🔒・closed-${channel.name}`);
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      interaction.reply({ content: 'حدث خطأ أثناء تنفيذ العملية.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);


