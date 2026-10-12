'use strict';
const Thread = require('../models/thread.js');

// Strip fields the client must never see
function cleanReply(r) {
  return { _id: r._id, text: r.text, created_on: r.created_on };
}
function cleanThread(t, replyLimit) {
  const sorted = [...t.replies].sort((a, b) => b.created_on - a.created_on);
  const replies = replyLimit ? sorted.slice(0, replyLimit) : sorted;
  return {
    _id: t._id,
    text: t.text,
    created_on: t.created_on,
    bumped_on: t.bumped_on,
    replies: replies.map(cleanReply),
    replycount: t.replies.length
  };
}

module.exports = function (app) {

  app.route('/api/threads/:board')

    // Create a thread
    .post(async (req, res) => {
      try {
        const board = req.params.board;
        const { text, delete_password } = req.body;
        if (!text || !delete_password) return res.send('missing required field(s)');
        const now = new Date();
        const thread = await Thread.create({
          board, text, delete_password,
          created_on: now, bumped_on: now, reported: false, replies: []
        });
        // Browser form submit -> back to the board; API/tests -> JSON
        if (req.accepts(['json', 'html']) === 'html') return res.redirect('/b/' + board + '/');
        res.json(thread);
      } catch (err) {
        res.status(500).send('error');
      }
    })

    // 10 most recently bumped threads, 3 newest replies each
    .get(async (req, res) => {
      try {
        const threads = await Thread.find({ board: req.params.board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .lean();
        res.json(threads.map(t => cleanThread(t, 3)));
      } catch (err) {
        res.status(500).send('error');
      }
    })

    // Delete a thread
    .delete(async (req, res) => {
      try {
        const { thread_id, delete_password } = req.body;
        const thread = await Thread.findOne({ _id: thread_id, board: req.params.board });
        if (!thread) return res.send('no thread found');
        if (thread.delete_password !== delete_password) return res.send('incorrect password');
        await thread.deleteOne();
        res.send('success');
      } catch (err) {
        res.send('no thread found');
      }
    })

    // Report a thread
    .put(async (req, res) => {
      try {
        const thread_id = req.body.thread_id || req.body.report_id;
        const result = await Thread.updateOne(
          { _id: thread_id, board: req.params.board },
          { $set: { reported: true } }
        );
        if (result.matchedCount === 0) return res.send('no thread found');
        res.send('reported');
      } catch (err) {
        res.send('no thread found');
      }
    });

  app.route('/api/replies/:board')

    // Add a reply and bump the thread
    .post(async (req, res) => {
      try {
        const { text, delete_password, thread_id } = req.body;
        if (!text || !delete_password || !thread_id) return res.send('missing required field(s)');
        const now = new Date();
        const thread = await Thread.findOneAndUpdate(
          { _id: thread_id, board: req.params.board },
          {
            $push: { replies: { text, delete_password, created_on: now, reported: false } },
            $set: { bumped_on: now }
          },
          { new: true }
        );
        if (!thread) return res.send('no thread found');
        if (req.accepts(['json', 'html']) === 'html') {
          return res.redirect('/b/' + req.params.board + '/' + thread_id);
        }
        res.json(thread);
      } catch (err) {
        res.send('no thread found');
      }
    })

    // Whole thread with all replies
    .get(async (req, res) => {
      try {
        const thread = await Thread.findOne({ _id: req.query.thread_id, board: req.params.board }).lean();
        if (!thread) return res.send('no thread found');
        res.json(cleanThread(thread));
      } catch (err) {
        res.send('no thread found');
      }
    })

    // "Delete" a reply (text becomes [deleted])
    .delete(async (req, res) => {
      try {
        const { thread_id, reply_id, delete_password } = req.body;
        const thread = await Thread.findOne({ _id: thread_id, board: req.params.board });
        if (!thread) return res.send('no thread found');
        const reply = thread.replies.id(reply_id);
        if (!reply) return res.send('no reply found');
        if (reply.delete_password !== delete_password) return res.send('incorrect password');
        reply.text = '[deleted]';
        await thread.save();
        res.send('success');
      } catch (err) {
        res.send('no thread found');
      }
    })

    // Report a reply
    .put(async (req, res) => {
      try {
        const { thread_id, reply_id } = req.body;
        const result = await Thread.updateOne(
          { _id: thread_id, board: req.params.board, 'replies._id': reply_id },
          { $set: { 'replies.$.reported': true } }
        );
        if (result.matchedCount === 0) return res.send('no reply found');
        res.send('reported');
      } catch (err) {
        res.send('no reply found');
      }
    });

};
