const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
  this.timeout(10000);

  const board = 'fcc_test';
  let threadId;   // kept for reply tests and reporting
  let threadId2;  // created only to be deleted
  let replyId;

  test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .send({ text: 'Test thread', delete_password: 'pass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.text, 'Test thread');
        assert.property(res.body, '_id');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.equal(res.body.reported, false);
        assert.isArray(res.body.replies);
        threadId = res.body._id;
        // second thread, used for the delete tests
        chai.request(server)
          .post('/api/threads/' + board)
          .send({ text: 'Thread to delete', delete_password: 'pass' })
          .end(function (err2, res2) {
            threadId2 = res2.body._id;
            done();
          });
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
    chai.request(server)
      .get('/api/threads/' + board)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        res.body.forEach(t => {
          assert.property(t, '_id');
          assert.property(t, 'text');
          assert.property(t, 'created_on');
          assert.property(t, 'bumped_on');
          assert.isArray(t.replies);
          assert.isAtMost(t.replies.length, 3);
          assert.notProperty(t, 'reported');
          assert.notProperty(t, 'delete_password');
        });
        done();
      });
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function (done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId2, delete_password: 'wrong' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function (done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId2, delete_password: 'pass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    chai.request(server)
      .put('/api/threads/' + board)
      .send({ thread_id: threadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
    chai.request(server)
      .post('/api/replies/' + board)
      .send({ thread_id: threadId, text: 'Test reply', delete_password: 'replypass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        const reply = res.body.replies[res.body.replies.length - 1];
        assert.equal(reply.text, 'Test reply');
        assert.property(reply, '_id');
        assert.property(reply, 'created_on');
        assert.equal(reply.reported, false);
        assert.equal(res.body.bumped_on, reply.created_on);
        replyId = reply._id;
        done();
      });
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
    chai.request(server)
      .get('/api/replies/' + board)
      .query({ thread_id: threadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body._id, threadId);
        assert.isArray(res.body.replies);
        assert.notProperty(res.body, 'reported');
        assert.notProperty(res.body, 'delete_password');
        assert.notProperty(res.body.replies[0], 'reported');
        assert.notProperty(res.body.replies[0], 'delete_password');
        done();
      });
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function (done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'wrong' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function (done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'replypass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
    chai.request(server)
      .put('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

});
