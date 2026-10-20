import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Property from '../models/Property.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Initiates or retrieves an existing canonical conversation for a property.
 * Enforces server-side landlord ownership to prevent spoofing.
 */
export const createOrGetConversation = async (req, res) => {
  try {
    const { propertyId, initialMessage } = req.body;

    if (!propertyId || !isValidObjectId(propertyId)) {
      return res.status(400).json({ success: false, message: 'Valid property ID is required.' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    // A user cannot negotiate with themselves on their own property
    if (property.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot start a negotiation conversation on your own property.',
      });
    }

    // Look for existing conversation between this tenant and property
    let conversation = await Conversation.findOne({
      propertyId: property._id,
      tenantId: req.user._id,
    });

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        propertyId: property._id,
        tenantId: req.user._id,
        landlordId: property.ownerId, // Server authoritative owner
        lastMessage: {
          text: initialMessage && initialMessage.trim() ? initialMessage.trim().slice(0, 100) : '',
          senderId: initialMessage && initialMessage.trim() ? req.user._id : null,
          createdAt: new Date(),
        },
      });

      await conversation.save();

      // If initial message provided, save it
      if (initialMessage && initialMessage.trim()) {
        const firstMsg = new Message({
          conversationId: conversation._id,
          senderId: req.user._id,
          senderRole: req.user.role === 'landlord' ? 'landlord' : 'tenant',
          senderName: req.user.name || 'User',
          content: initialMessage.trim().slice(0, 2000),
        });
        await firstMsg.save();
        conversation.unreadLandlordCount = 1;
        await conversation.save();
      }
    }

    // Populate for response
    await conversation.populate([
      { path: 'propertyId', select: 'title photos price city address area transactionType listingType status' },
      { path: 'tenantId', select: 'name profileImage role' },
      { path: 'landlordId', select: 'name profileImage role' },
    ]);

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('createOrGetConversation error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error processing conversation.' });
  }
};

/**
 * Returns all conversations the authenticated user participates in.
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      $or: [{ tenantId: userId }, { landlordId: userId }],
    })
      .sort({ updatedAt: -1 })
      .populate([
        { path: 'propertyId', select: 'title photos price city address area transactionType listingType status' },
        { path: 'tenantId', select: 'name profileImage role' },
        { path: 'landlordId', select: 'name profileImage role' },
      ]);

    return res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error('getConversations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve conversations.' });
  }
};

/**
 * Returns the aggregate unread message count for the authenticated user across all conversations.
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdStr = userId.toString();

    const conversations = await Conversation.find({
      $or: [{ tenantId: userId }, { landlordId: userId }],
    }).select('tenantId landlordId unreadTenantCount unreadLandlordCount');

    let totalUnread = 0;
    for (const conv of conversations) {
      if (conv.tenantId && conv.tenantId.toString() === userIdStr) {
        totalUnread += conv.unreadTenantCount || 0;
      } else if (conv.landlordId && conv.landlordId.toString() === userIdStr) {
        totalUnread += conv.unreadLandlordCount || 0;
      }
    }

    return res.status(200).json({ success: true, unreadCount: totalUnread });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return res.status(500).json({ success: false, message: 'Failed to count unread messages.' });
  }
};

/**
 * Returns single conversation details if user is authorized.
 */
export const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
    }

    const conversation = await Conversation.findById(id).populate([
      { path: 'propertyId', select: 'title photos price city address area transactionType listingType status' },
      { path: 'tenantId', select: 'name profileImage role' },
      { path: 'landlordId', select: 'name profileImage role' },
    ]);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const userIdStr = req.user._id.toString();
    const isParticipant =
      conversation.tenantId?._id?.toString() === userIdStr ||
      conversation.landlordId?._id?.toString() === userIdStr;

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('getConversationById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load conversation.' });
  }
};

/**
 * Returns chronological message history and marks unread messages as read.
 */
export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const userIdStr = req.user._id.toString();
    const isParticipant =
      conversation.tenantId.toString() === userIdStr ||
      conversation.landlordId.toString() === userIdStr;

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    // Retrieve messages
    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });

    // Mark messages from the other user as read
    await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.user._id }, read: false },
      { $set: { read: true } }
    );

    // Reset unread counter for current user
    if (conversation.tenantId.toString() === userIdStr && conversation.unreadTenantCount > 0) {
      conversation.unreadTenantCount = 0;
      await conversation.save();
    } else if (conversation.landlordId.toString() === userIdStr && conversation.unreadLandlordCount > 0) {
      conversation.unreadLandlordCount = 0;
      await conversation.save();
    }

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
  }
};

/**
 * Sends a new message in an authorized conversation.
 */
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message exceeds maximum length of 2000 characters.' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const userIdStr = req.user._id.toString();
    const isTenant = conversation.tenantId.toString() === userIdStr;
    const isLandlord = conversation.landlordId.toString() === userIdStr;

    if (!isTenant && !isLandlord) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    const senderRole = isTenant ? 'tenant' : 'landlord';

    const message = new Message({
      conversationId: conversation._id,
      senderId: req.user._id,
      senderRole,
      senderName: req.user.name || (isTenant ? 'Tenant' : 'Landlord'),
      content: content.trim(),
    });

    await message.save();

    // Update conversation metadata
    conversation.lastMessage = {
      text: content.trim().slice(0, 100),
      senderId: req.user._id,
      createdAt: new Date(),
    };

    if (isTenant) {
      conversation.unreadLandlordCount = (conversation.unreadLandlordCount || 0) + 1;
    } else {
      conversation.unreadTenantCount = (conversation.unreadTenantCount || 0) + 1;
    }

    await conversation.save();

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

/**
 * Exports conversation history as formatted TXT or valid PDF.
 */
export const exportConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const format = String(req.query.format || 'txt').toLowerCase();

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
    }

    const conversation = await Conversation.findById(id).populate([
      { path: 'propertyId', select: 'title address city price transactionType' },
      { path: 'tenantId', select: 'name' },
      { path: 'landlordId', select: 'name' },
    ]);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const userIdStr = req.user._id.toString();
    const isParticipant =
      conversation.tenantId?._id?.toString() === userIdStr ||
      conversation.landlordId?._id?.toString() === userIdStr;

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to export this conversation.',
      });
    }

    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });

    const propertyTitle = conversation.propertyId?.title || 'Property';
    const cleanFileName = propertyTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const tenantName = conversation.tenantId?.name || 'Tenant';
    const landlordName = conversation.landlordId?.name || 'Landlord';
    const exportTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (format === 'pdf') {
      // PDF EXPORT
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="RentEase_Chat_${cleanFileName}_${Date.now()}.pdf"`
      );

      doc.pipe(res);

      // Header Banner
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text('Rent Ease — Negotiation Transcript', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(`Official Property Inquiries & Negotiation Record | Exported: ${exportTime}`, {
          align: 'center',
        });

      doc.moveDown(1);
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Property & Participants Metadata Box
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('Property Details:');
      doc.font('Helvetica').fontSize(10).fillColor('#334155');
      doc.text(`Title: ${propertyTitle}`);
      doc.text(`Location: ${conversation.propertyId?.address || ''}, ${conversation.propertyId?.city || ''}`);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('Participants:');
      doc.font('Helvetica').fontSize(10).fillColor('#334155');
      doc.text(`Tenant: ${tenantName}`);
      doc.text(`Landlord: ${landlordName}`);
      doc.text(`Total Messages: ${messages.length}`);

      doc.moveDown(1);
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Messages Section
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#1E293B').text('Message History:');
      doc.moveDown(0.5);

      if (messages.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#94A3B8').text('No messages in this conversation.');
      } else {
        messages.forEach((msg, idx) => {
          const isSenderTenant = msg.senderRole === 'tenant';
          const msgTime = new Date(msg.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(isSenderTenant ? '#0284C7' : '#D97706')
            .text(`${msg.senderName} (${isSenderTenant ? 'Tenant' : 'Landlord'}) — ${msgTime}`);

          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#1E293B')
            .text(msg.content, { indent: 10 });

          doc.moveDown(0.8);

          // Add page if close to bottom
          if (doc.y > 740) {
            doc.addPage();
          }
        });
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor('#94A3B8')
        .text('Rent Ease — End of verified chat transcript.', { align: 'center' });

      doc.end();
      return;
    }

    // TXT EXPORT (Default)
    let txtContent = '=======================================================\n';
    txtContent += 'RENT EASE — PROPERTY NEGOTIATION TRANSCRIPT\n';
    txtContent += '=======================================================\n\n';
    txtContent += `Property:       ${propertyTitle}\n`;
    txtContent += `Location:       ${conversation.propertyId?.address || ''}, ${conversation.propertyId?.city || ''}\n`;
    txtContent += `Tenant:         ${tenantName}\n`;
    txtContent += `Landlord:       ${landlordName}\n`;
    txtContent += `Exported On:    ${exportTime}\n`;
    txtContent += `Total Messages: ${messages.length}\n\n`;
    txtContent += '-------------------------------------------------------\n';
    txtContent += 'CONVERSATION HISTORY\n';
    txtContent += '-------------------------------------------------------\n\n';

    if (messages.length === 0) {
      txtContent += '(No messages in this conversation yet)\n';
    } else {
      messages.forEach((msg) => {
        const msgTime = new Date(msg.createdAt).toISOString().replace('T', ' ').slice(0, 19);
        const role = msg.senderRole === 'tenant' ? 'Tenant' : 'Landlord';
        txtContent += `[${msgTime}] ${msg.senderName} (${role}):\n`;
        txtContent += `${msg.content}\n\n`;
      });
    }

    txtContent += '-------------------------------------------------------\n';
    txtContent += 'End of Transcript — Generated securely by Rent Ease.\n';
    txtContent += '=======================================================\n';

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="RentEase_Chat_${cleanFileName}_${Date.now()}.txt"`
    );

    return res.status(200).send(txtContent);
  } catch (error) {
    console.error('exportConversation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate export file.' });
  }
};
