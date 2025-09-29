#!/bin/bash

echo "Fixing cache-utils.ts Redis references..."

FILE="/Users/Sam/atlas-fitness-onboarding/app/lib/cache/cache-utils.ts"

# Fix invalidateCache method
sed -i '' 's/if (!this\.redis) return 0;/const redis = await this.ensureRedis();\n    if (!redis) return 0;/g' "$FILE"
sed -i '' 's/const keys = await this\.redis\.keys(pattern);/const keys = await redis.keys(pattern);/g' "$FILE"
sed -i '' 's/const result = await this\.redis\.del(\.\.\./const result = await redis.del(.../g' "$FILE"

# Fix mget method
sed -i '' 's/if (!this\.redis || keys\.length === 0)/const redis = await this.ensureRedis();\n    if (!redis || keys.length === 0)/g' "$FILE"
sed -i '' 's/const values = await this\.redis\.mget(\.\.\./const values = await redis.mget(.../g' "$FILE"

# Fix mset method
sed -i '' 's/if (!this\.redis || items\.length === 0)/const redis = await this.ensureRedis();\n    if (!redis || items.length === 0)/g' "$FILE"
sed -i '' 's/const pipeline = this\.redis\.pipeline/const pipeline = redis.pipeline/g' "$FILE"

# Fix acquireLock method
sed -i '' 's/if (!this\.redis) return false;/const redis = await this.ensureRedis();\n    if (!redis) return false;/g' "$FILE"
sed -i '' 's/const result = await this\.redis\.set(lockKey/const result = await redis.set(lockKey/g' "$FILE"

# Fix releaseLock method
sed -i '' 's/if (!this\.redis) return;/const redis = await this.ensureRedis();\n    if (!redis) return;/g' "$FILE"
sed -i '' 's/await this\.redis\.del(lockKey);/await redis.del(lockKey);/g' "$FILE"

# Fix flushAll method
sed -i '' 's/if (!this\.redis) return;/const redis = await this.ensureRedis();\n    if (!redis) return;/g' "$FILE"
sed -i '' 's/await this\.redis\.flushall/await redis.flushall/g' "$FILE"

echo "✅ Fixed all Redis references in cache-utils.ts"