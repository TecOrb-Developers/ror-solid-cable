# Real-Time Chat Application with Rails 8 Solid Cable

A production-ready real-time chat application built with Rails 8, demonstrating Solid Cable's database-backed WebSocket communication with MySQL.

## Table of Contents

- [What is Solid Cable?](#what-is-solid-cable)
- [Features](#features)
- [Solid Cable vs Redis](#solid-cable-vs-redis)
- [Requirements](#requirements)
- [Installation & Setup](#installation--setup)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Performance Considerations](#performance-considerations)

## What is Solid Cable?

Solid Cable is a **database-backed adapter for Action Cable** introduced as the default in Rails 8. Instead of requiring Redis for pub/sub messaging, it uses your existing relational database (MySQL, PostgreSQL, or SQLite) to store and broadcast messages via a lightweight polling mechanism.

### Key Benefits

- **No Redis Required** - Eliminates an entire piece of infrastructure
- **Simplified Deployment** - Works anywhere your database works
- **Unified Storage** - All data in one database
- **Cost-Effective** - No separate Redis hosting fees
- **Rails 8 Default** - Zero configuration for new apps

## Features

This application demonstrates:

- Real-time bidirectional WebSocket communication
- Multi-user chat with instant message delivery
- Database-backed message broadcasting
- Responsive UI with Tailwind CSS
- Stimulus controllers for interactive behavior
- Connection authentication support (optional)

## Solid Cable vs Redis

| Feature | Solid Cable | Redis Adapter |
|---------|-------------|---------------|
| **Backend** | Database with polling (every 0.1s) | Redis pub/sub (event-driven) |
| **Performance** | Good for <1000 concurrent users | Excellent for high concurrency |
| **Infrastructure** | Database only | Requires Redis server |
| **Deployment** | Simpler (one service) | More complex (two services) |
| **Cost** | Lower (no Redis hosting) | Higher (Redis hosting required) |
| **Latency** | ~100-200ms typical | <50ms typical |
| **Best For** | Small-medium apps, simpler ops | High-traffic, performance-critical apps |

### When to Use Solid Cable

Applications with <1000 concurrent WebSocket connections  
Projects prioritizing operational simplicity  
Development and testing environments  
Platforms where Redis isn't easily available  
Cost-sensitive deployments  

### When to Use Redis
High-traffic applications (1000+ concurrent users)  
Sub-100ms message delivery requirements  
Very high message throughput (100+ msgs/second)  
When Redis is already in your stack  

## Requirements

- **Ruby**: 3.2.4
- **Rails**: 8.0+
- **MySQL**: 8.0+ (or PostgreSQL 12+, SQLite 3.8+)
- **Node.js**: 18+ (for JavaScript dependencies)

### Gemfile

```ruby
ruby '3.2.4'

gem 'rails', '~> 8.0'
gem 'mysql2', '~> 0.5'
gem 'solid_cable' # Included by default in Rails 8
gem 'importmap-rails'
gem 'stimulus-rails'
gem 'turbo-rails'
```

## Installation & Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd <project-directory>
bundle install
```

### 2. Database Configuration

Create `config/database.yml`:

```yaml
default: &default
  adapter: mysql2
  encoding: utf8mb4
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  username: root
  password: your_password
  socket: /tmp/mysql.sock

development:
  primary: &primary_development
    <<: *default
    database: solid_demo_development
  cable:
    <<: *primary_development
    migrations_paths: db/cable_migrate

test:
  <<: *default
  database: solid_demo_test

production:
  primary: &primary_production
    <<: *default
    database: solid_demo_production
    username: <%= ENV['DB_USERNAME'] %>
    password: <%= ENV['DB_PASSWORD'] %>
  cable:
    <<: *primary_production
    database: solid_demo_production_cable
    migrations_paths: db/cable_migrate
```

**Note**: For development, the `cable` configuration inherits from `primary_development`, so it uses the same database. For production, you can optionally use a separate database.But in Our project we are using the different database for cable and primary.

### 3. Cable Adapter Configuration

Verify `config/cable.yml`:

```yaml
development:
  adapter: solid_cable
  connects_to:
    database:
      writing: cable
  polling_interval: 0.1.seconds
  message_retention: 1.day

test:
  adapter: test

production:
  adapter: solid_cable
  connects_to:
    database:
      writing: cable
  polling_interval: 0.1.seconds
  message_retention: 1.day
```

**Important**: The `writing: cable` name must match the `cable:` key in `database.yml`.

### 4. Install Solid Cable and Create Tables

```bash
# Install Solid Cable migrations
rails solid_cable:install

# Create databases
rails db:create

# Run migrations
rails db:migrate
```

This creates the `solid_cable_messages` table:

```ruby
create_table :solid_cable_messages do |t|
  t.binary :channel, limit: 1024, null: false
  t.binary :payload, limit: 536870912, null: false
  t.datetime :created_at, null: false
  t.bigint :channel_hash, null: false
  
  t.index :channel, length: 191
  t.index :channel_hash
  t.index :created_at
end
```

### 5. Mount Action Cable

Ensure `config/routes.rb` includes:

```ruby
Rails.application.routes.draw do
  root "chat#index"
  
  mount ActionCable.server => '/cable'
end
```

## How It Works

### Message Flow

```
User A sends message
       ↓
ChatChannel#speak
       ↓
ActionCable.server.broadcast("chat_room", data)
       ↓
Solid Cable writes to solid_cable_messages table
       ↓
Solid Cable polls database (every 0.1s)
       ↓
New messages detected
       ↓
WebSocket pushes to all subscribers
       ↓
User B receives message in real-time
```

### Key Components

#### 1. Chat Channel (`app/channels/chat_channel.rb`)

#### 2. Stimulus Controller (`app/javascript/controllers/chat_controller.js`)

## Configuration

### Polling Interval

Adjust how often Solid Cable checks for new messages in `config/cable.yml`:

```yaml
development:
  adapter: solid_cable
  polling_interval: 0.1.seconds  # Check every 100ms
```

**Trade-offs**:
- Lower interval (0.05s) = faster messages, higher DB load
- Higher interval (0.3s) = lower DB load, slight delay in messages

### Message Retention

Control how long messages stay in the database:

```yaml
development:
  adapter: solid_cable
  message_retention: 1.day  # Auto-delete messages after 1 day
```

Options: `1.hour`, `6.hours`, `1.day`, `3.days`

### Development Environment Settings

In `config/environments/development.rb`, ensure:

```ruby
config.action_cable.disable_request_forgery_protection = true
config.action_cable.allowed_request_origins = ['http://localhost:3000']
```

## Running the Application

### Start the Server

```bash
rails server
```

Visit `http://localhost:3000`

### Testing Real-Time Features

1. Open **two browser windows** side by side at `http://localhost:3000`
2. Type a message in one window and click "Send"
3. Watch the message appear instantly in the other window
4. Check the Rails console - you should see:
   ```
   ChatChannel#speak({"message"=>"Hello"})
   Broadcasting to chat_room: {:message=>"Hello", :sender=>"User123", ...}
   ```

## Performance Considerations

### Database Load

Solid Cable polls the database every 0.1 seconds by default. For production:

1. **Monitor DB Performance**:
   ```sql
   SHOW PROCESSLIST;
   SHOW STATUS LIKE 'Threads%';
   ```

2. **Optimize Indexes** (already included):
   - `channel_hash` - Fast lookups
   - `created_at` - Efficient cleanup

3. **Connection Pooling**:
   ```yaml
   production:
     cable:
       pool: 25  # Adjust based on concurrent users
   ```

### When to Switch to Redis

Consider Redis if you experience:
- Database CPU consistently >70% due to cable polling
- More than 1000 concurrent WebSocket connections
- Message latency >500ms
- High-frequency broadcasts (>100 messages/second)

**Switching to Redis** is simple - just update `cable.yml`:

```yaml
production:
  adapter: redis
  url: <%= ENV.fetch("REDIS_URL") { "redis://localhost:6379/1" } %>
  channel_prefix: myapp_production
```

## Production Deployment

### Deployment Checklist

- [ ] Set `RAILS_ENV=production`
- [ ] Run `rails assets:precompile`
- [ ] Run `rails db:migrate`
- [ ] Set appropriate `message_retention` in `cable.yml`
- [ ] Configure Action Cable allowed origins:
  ```ruby
  config.action_cable.allowed_request_origins = ['https://yourdomain.com']
  ```

### Official Documentation
- [Rails 8 Release Notes](https://edgeguides.rubyonrails.org/8_0_release_notes.html)
- [Solid Cable GitHub](https://github.com/rails/solid_cable)
- [Action Cable Overview](https://guides.rubyonrails.org/action_cable_overview.html)
- [Action Cable API](https://api.rubyonrails.org/classes/ActionCable.html)

### Tutorials
- [Building Real-Time Features with Solid Cable](https://www.youtube.com/watch?v=example)
- [Rails 8: Solid Cable](https://blog.example.com)

