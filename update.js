'use strict';
require('./utility/essentials.js');
require('colors');
const mongo = require('mongodb').MongoClient;
global.dbcs = {};
const usedDBCs = [
	'users',
	'questions',
	'qtags',
	'answers',
	'posthistory',
	'chathistory',
	'chatstars',
	'chatusers',
	'chatrooms',
	'programs',
	'comments',
	'commenthistory',
	'votes',
	'lessons'
];
/*
db.questions.remove({},{multi:true})
db.questions.insert({ "_id" : 1, "title" : "How can I add two numbers?", "lang" : "JavaScript", "description" : "If I had a number `a` and another number `b`, how would I find `a` plus `b`?\n\nI want to assign it to a new variable, like `c`. Or maybe have it assigned back to `a` or `b`.", "question" : "How can numbers be added with JavaScript?", "code" : "var a = 24;\nvar b = 42;\nvar c // = ?;", "type" : "how", "tags" : [ 2 ], "gr" : true, "user" : "bjb", "time" : 1443932320102, "score" : 0, "answers" : 3, "hotness" : 0, "upvotes" : 0 })
db.questions.insert({ "_id" : 2, "title" : "How can I multiply two numbers?", "lang" : "JavaScript", "description" : "I have two numbers, `a` and `b`, and I want to plutify — or multiply — them together to make another number. I know how to *add* two numbers, you use `a + b`, but how do you *multiply* them?", "question" : "Is there an operator that multiplies two numbers?", "code" : "var a = 3;\nvar b = 7;\nvar c = a ??? b; // ?", "type" : "how", "tags" : [ 2 ], "gr" : true, "user" : "tester1", "time" : 1451625925732, "score" : 0, "hotness" : 0, "upvotes" : 0, "answers" : 0, "private" : true, "deleted" : { "by" : [ "bjb" ], "time" : 1465559289194 }})

db.posthistory.update({qquestion:null},{$unset:{qquestion:true}},{multi:true})
db.commenthistory.drop()
*/
const verbose = process.argv.includes('--verbose');
console.log('Connecting to mongodb…'.cyan);
mongo.connect('mongodb://localhost:27017/DevDoodle', function(err, db) {
	if (err) throw err;
	db.createCollection('questions', function(err, collection) {
		if (err) throw err;
		db.createIndex('questions', {description: 'text'}, {}, function() {});
		dbcs.questions = collection;
	});
	db.createCollection('chat', function(err, collection) {
		if (err) throw err;
		db.createIndex('chat', {body: 'text'}, {}, function() {});
		dbcs.chat = collection;
	});
	let i = usedDBCs.length;
	function handleCollection(err, collection) {
		if (err) throw err;
		dbcs[usedDBCs[i]] = collection;
		if (usedDBCs[i] == 'chatusers') collection.drop();
	}
	while (i--) db.collection(usedDBCs[i], handleCollection);
	console.log('Connected to mongodb.'.cyan);
	let questionCursor = dbcs.questions.find(), taCursor, tcCursor, programCursor = dbcs.programs.find();
	var question, answer, comment, program;
	function programCommentHandler(err, p) {
		if (err) throw err;
		if (verbose) console.log('a program comment', p);
		if (p) {
			if (typeof p._id == 'number') {
				comment = p;
				comment.oid = comment._id;
				comment._id = generateID();
				comment.program = program._id;
				console.log('comment', comment.oid);
				dbcs.comments.remove({_id: comment.oid});
				let oid = comment.oid;
				delete comment.oid;
				dbcs.comments.insert(comment);
				comment.oid = oid;
				tcCursor.next(programCommentHandler);
			} else tcCursor.next(programCommentHandler);
		} else programCursor.next(programHandler);
	}
	function answerCommentHandler(err, p) {
		if (err) throw err;
		if (verbose) console.log('a answer comment', p);
		if (p) {
			if (typeof p._id == 'number') {
				comment = p;
				comment.oid = comment._id;
				comment._id = generateID();
				comment.answer = answer._id;
				console.log('comment', comment.oid);
				dbcs.comments.remove({_id: comment.oid});
				let oid = comment.oid;
				delete comment.oid;
				dbcs.comments.insert(comment);
				comment.oid = oid;
				tcCursor.next(answerCommentHandler);
			} else tcCursor.next(answerCommentHandler);
		} else taCursor.next(answerHandler);
	}
	function questionCommentHandler(err, p) {
		if (err) throw err;
		if (verbose) console.log('a question comment', p);
		if (p) {
			if (typeof p._id == 'number') {
				comment = p;
				comment.oid = comment._id;
				comment._id = generateID();
				comment.question = question._id;
				console.log('comment', comment.oid);
				dbcs.comments.remove({_id: comment.oid});
				let oid = comment.oid;
				delete comment.oid;
				dbcs.comments.insert(comment);
				comment.oid = oid;
				tcCursor.next(questionCommentHandler);
			} else tcCursor.next(questionCommentHandler);
		} else {
			taCursor = dbcs.answers.find({question: question.oid});
			taCursor.next(answerHandler);
		}
	}
	function answerHandler(err, p) {
		if (err) throw err;
		if (verbose) console.log('a answer', p);
		if (p) {
			if (typeof p._id == 'number') {
				answer = p;
				answer.oid = answer._id;
				answer._id = generateID();
				answer.question = question._id;
				console.log('answer', answer.oid);
				dbcs.answers.remove({_id: answer.oid});
				let oid = answer.oid;
				delete answer.oid;
				dbcs.answers.insert(answer);
				answer.oid = oid;
				tcCursor = dbcs.comments.find({answer: answer.oid});
				tcCursor.next(answerCommentHandler);
			} else taCursor.next(answerHandler);
		} else questionCursor.next(questionHandler);
	}
	function questionHandler(err, p) {
		if (err) throw err;
		if (verbose) console.log('a question', p);
		if (p) {
			if (typeof p._id == 'number') {
				question = p;
				question.oid = question._id;
				let nid = question._id = generateID();
				console.log('question', question.oid);
				dbcs.questions.remove({_id: question.oid});
				let oid = question.oid;
				delete question.oid;
				dbcs.questions.insert(question);
				question.oid = oid;
				dbcs.posthistory.find({$or: [{q: question.oid}, {question: question.oid}]}).each(function(err, ph) {
					if (err) throw err;
					console.log(nid);
					console.log(ph);
					if (ph) {
						dbcs.posthistory.update({time: ph.time}, {$set: {
							qquestion: ph.question,
							question: nid
						}, $unset: {q: true}});
					}
				});
				tcCursor = dbcs.comments.find({question: question.oid});
				tcCursor.next(questionCommentHandler);
			} else questionCursor.next(questionHandler);
		} else {
			console.log('Questions Done.'.green);
			programCursor.next(programHandler);
		}
	}
	function programHandler(err, p) {
		if (err) throw err;
		if (verbose) console.log('a program', p);
		if (p) {
			if (typeof p._id == 'number') {
				program = p;
				program.oid = program._id;
				program._id = generateID();
				console.log('program', program.oid);
				dbcs.programs.remove({_id: program.oid});
				let oid = program.oid;
				delete program.oid;
				dbcs.programs.insert(program);
				program.oid = oid;
				tcCursor = dbcs.comments.find({program: program.oid});
				tcCursor.next(programCommentHandler);
			} else programCursor.next(programHandler);
		} else {
			console.log('Programs Done.'.green);
			process.exit();
		}
	}
	function programHandler(err, p) {
		if (err) throw err;
		if (verbose) console.log('a program', p);
		if (p) {
			if (typeof p._id == 'number') {
				program = p;
				program.oid = program._id;
				program._id = generateID();
				console.log('program', program.oid);
				dbcs.programs.remove({_id: program.oid});
				let oid = program.oid;
				delete program.oid;
				dbcs.programs.insert(program);
				program.oid = oid;
				tcCursor = dbcs.comments.find({program: program.oid});
				tcCursor.next(programCommentHandler);
			} else programCursor.next(programHandler);
		} else {
			console.log('Programs Done.'.green);
			dbcs.chatrooms.find().each(function(err, p) {
				if (err) throw err;
				if (p) {
					if (typeof p._id != 'number') return;
					let oid = p._id;
					let nid = p._id = generateID();
					console.log('chatroom', oid);
					dbcs.chatrooms.remove({_id: oid});
					dbcs.chatrooms.insert(p);
					dbcs.chat.update({room: oid}, {$set: {room: nid}}, {multi: true});
				} else {
					console.log('Chatrooms Done.'.green);
					process.exit();
				}
			});
		}
	}
	questionCursor.next(questionHandler);
});