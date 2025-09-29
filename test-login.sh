#!/bin/bash

echo "Testing login API..."
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sam@gymleadhub.co.uk","password":"Testing@123!"}' \
  -c cookies.txt -v