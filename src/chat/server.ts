import * as faker from 'faker';
import * as moment from 'moment';
import * as express from 'express';
import * as http from 'http';
import * as io from 'socket.io';
import * as Redis from 'ioredis';

var app= express()
var socket = io()
var server=http.createServer(app)
var port = 3000
const redis_address = "localhost:6379" // ここをRedisサーバに書き換える

var redis = new Redis(redis_address);
var redis_subscribers = {};
var channel_history_max = 10;

// ヘルスチェック用エンドポイント
app.use(express.static('public'));
app.get('/health', function(request, response) {
    response.send('ok');
});

// サブスクライブするチャンネルの登録
function add_redis_subscriber(subscriber_key) {
    var client = new Redis(redis_address);

    client.subscribe(subscriber_key);
    client.on('message', function(channel, message) {
        socket.emit(subscriber_key, JSON.parse(message));
    });

    redis_subscribers[subscriber_key] = client;
}

// メッセージ、メンバ追加、メンバ削除用のチャンネルを追加
add_redis_subscriber('messages');
add_redis_subscriber('member_add');
add_redis_subscriber('member_delete');

socket.on('connection', function(socket) {
    var get_members = redis.hgetall('members').then(function(redis_members) {
        var members = {};
        for (var key in redis_members) {
            members[key] = JSON.parse(redis_members[key]);
        }
        return members;
    });

    var initialize_member = get_members.then(function(members) {
        if (members[socket.id]) {
            return members[socket.id];
        }

        var username = faker.fake("{{name.firstName}} {{name.lastName}}");
        var member = {
            socket: socket.id,
            username: username,
            //avatar: "//api.adorable.io/avatars/30/" + username + '.png'
        };

        return redis.hset('members', socket.id, JSON.stringify(member)).then(function() {
            return member;
        });
    });

    // get the highest ranking messages (most recent) up to channel_history_max size
    var get_messages = redis.zrange('messages', -1 * channel_history_max, -1).then(function(result) {
        return result.map(function(x) {
            return JSON.parse(x);
        });
    });

    Promise.all([get_members, initialize_member, get_messages]).then(function(values) {
        var members = values[0];
        var member = values[1];
        var messages = values[2];

        socket.emit('member_history', members);
        socket.emit('message_history', messages);

        redis.publish('member_add', JSON.stringify(member));

        socket.on('send', function(message_text) {
            var date = moment.now();
            var message = JSON.stringify({
                date: date,
                username: member['username'],
                avatar: member['avatar'],
                message: message_text
            });

            redis.zadd('messages', date.toString(), message);
            redis.publish('messages', message);
        });

        socket.on('disconnect', function() {
            redis.hdel('members', socket.id);
            redis.publish('member_delete', JSON.stringify(socket.id));
        });
    }).catch(function(reason) {
        console.log('ERROR: ' + reason);
    });
});

server.listen(port, function() {
    console.log('Started server on port ' + port);
});


