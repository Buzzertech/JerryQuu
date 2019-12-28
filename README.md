# JerryQuu
[![CircleCI](https://circleci.com/gh/Buzzertech/JerryQuu/tree/master.svg?style=svg)](https://circleci.com/gh/Buzzertech/JerryQuu/tree/master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm](https://img.shields.io/npm/dt/jerryquu.svg)](https://npmjs.com/package/jerryquu)
[![npm](https://img.shields.io/npm/v/jerryquu.svg)](https://www.npmjs.com/package/jerryquu)


JerryQuu is a fast, reliable redis-based email queue for Node.js applications. The library has cool features such as a custom handler, retries, etc. Also, this library explicitly has zero dependencies.

## Features
- Implements a FIFO queuing mechanism with the help of Redis.
- Use any redis client of your choice until it supports [keyspace events](https://redis.io/topics/notifications)
- If any of the message couldn't be sent by Nodemailer, JerryQuu adds the message back to the queue so that it can be processed again. By default, JerryQuu has a maximum retry limit of 4.
- You can write your own custom handler to handle messages.

## Why use JerryQuu over something like Amazon SQS ?
If you are building a small project and you don't want to get into handling something like SQS and you already are utilizing redis in some or the other way in your app, use JerryQuu. I built this tool for a small side project of mine and thought it would be cool for someone who doesn't want to get into SQS but wants to integrate a fast queuing system in their Node.js application


## Installation
```sh
npm install jerryquu
```

## Usage

### Step by step

JerryQuu requires you to provide a client to handle redis operation. Make sure the redis client you choose supports redis's subscription pattern.

I personally recommend [IORedis](https://github.com/luin/ioredis) because it is easy to use and has a robust api.
```javascript
  const IoRedis = require('ioredis');
  const Redis = new IoRedis(); // Redis Client 1 (for basic operations)
  const SubscriberRedis = new IoRedis(); // Redis Client 2 (for subscribing to events when messages are added)
```

JerryQuu relies on Nodemailer to send messages. It expects you to provide it with a transporter (we will be covering that below). It supports any kind of transporter you provide.

```javascript
  const Nodemailer = require('nodemailer');
  const transport = Nodemailer.createTransport();
```

Import EmailQueue from JerryQuu
```javascript
  const JerryQuu = require('jerryquu');
  const EmailQueue = JerryQuu.EmailQueue;
```

You can create subsequent number of instances of `Email Queue` for the number of queues you would need. One use case where you could need multiple instances is when you need multiple queues for eg. confirmation emails, password reset, etc.

```javascript
  const confirmationEmailsQueue = new EmailQueue({
    redis: Redis,
    subscriber: SubscriberRedis,
    transport: transport
  });

  const passResetEmailQueue = new EmailQueue({
    redis: Redis,
    subscriber: SubscriberRedis,
    transport: transport
  });
```

After creating an instance of `EmailQueue`, you have to register a namespace. Namespace in JerryQuu is nothing but a variable key which we use to store your messages in redis. Per instance, you could only register one namespace. Because, it is ideal to have one namespace per instance to segregate messages properly and avoiding loss of data.

```javascript
confirmationEmailsQueue.registerNamespace('confirmationEmail');
passResetEmailQueue.registerNamespace('passResetEmailQueue');
```

Now, the queue are ready to use. You can push a message like this ```myqueue.pushMessage(message)``` where message is basically the object you would generally pass to ```transport.sendMail(message)```

```javascript
  confirmationEmailsQueue.pushMessage({
    to: 'receiver@example.com',
    from: 'sender@example.com',
    subject: 'Hey, thanks for registering!',
    html: '<b>Thank you for registering</b>',
    text: 'Thank you for registering'
  });

  passResetEmailQueue.pushMessage({
    to: 'receiver@example.com',
    from: 'sender@example.com',
    subject: 'Password reset',
    html: '<b>Reset your password</b>',
    text: 'Reset your password'
  })
```

### Basic Example
```javascript
const EmailQueue = require('jerryquu').EmailQueue;
const Redis = require('ioredis');
const Nodemailer = require('Nodemailer');

const transport = Nodemailer.createTransport();

const queue = new EmailQueue({
  redis: new Redis(), // we use separate instance for doing operations such as get, set, lpush, rpush, etc
  subscriber: new Redis() // we use a separate instance subscriber for listening to events
  transport: transport // provide a nodemailer transport to send your emails
});

queue.registerNamespace('MyTestQueue'); // Registering a namespace helps to maintain a separate space for all your queue messages in the redis db

// Pushes your message to the queue
queue.pushMessage({
  to: 'to@example.com',
  from: 'from@example.com',
  subject: 'Test Mail',
  html: '<html>Hello world</html>',
  text: 'Hello world'
});
```

### Custom handler
If you would like to handle the queue yourself, JerryQuu allows you to do that by passing a handler while registering a namespace

```javascript
const handler = function (namespace, ctx) {
  const opts = ctx.opts;

  opts.redis.lrange(namespace, 0, -1, function (err, messages) {
    if (err) {
      throw err;
    }

    messages.forEach(function (message) {
    // make sure you parse the message because since we use a list to store the messages, we stringify the object before adding it to the queue
     message = JSON.parse(message);
     console.log(message);
    });
  });
}

myTestQueue.registerNamespace('customHandlerQueue', handler);
```

## API references

### EmailQueue
```typescript
interface IEmailQueueOpts {
    /** A separate instance of redis to work with the queue */
    redis: RedisClient;
    /** A separate instance of redis to subscribe to events internally */
    subscriberRedis: RedisClient;
    /** Default retries is set to 4 */
    maxRetries?: number;
    /** Nodemailer Transport **/
    transport: Nodemailer.Transport;
}

interface IHandlerCtx {
  redis: RedisClient,
  transport: Nodemailer.transport
}

constructor(opts: IEmailQueueOpts);

queueHandler(namespace: string, ctx: { opts: IHandlerCtx } );

registerNamespace(namespace: string, handler?: queueHandler);
```

### Feel free to contribute
I would like to have some of you guys contribute to this repo and improve this module altogether. Any issues, PR or any sort of contribution is appreciated :)

### License
MIT
