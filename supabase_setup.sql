-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Families Table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  "inviteCode" TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  "familyId" UUID REFERENCES families(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards Table
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  "closingDay" INTEGER NOT NULL,
  "dueDay" INTEGER NOT NULL,
  color TEXT
);

-- Expenses Table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  location TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  installments INTEGER NOT NULL,
  date DATE NOT NULL,
  card TEXT NOT NULL,
  "cardId" UUID REFERENCES cards(id),
  purchaser TEXT NOT NULL,
  category TEXT NOT NULL,
  "isRecurring" BOOLEAN DEFAULT FALSE,
  observation TEXT
);



