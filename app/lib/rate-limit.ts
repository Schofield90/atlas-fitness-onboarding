import { LRUCache } from 'lru-cache'
import { NextRequest } from 'next/server'

type Options = {
  uniqueTokenPerInterval?: number
  interval?: number
}

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  })

  return {
    check: async (req: NextRequest, limit: number, token: string) => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0]
      
      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1])
        return true
      }
      
      if (tokenCount[0] < limit) {
        tokenCount[0] += 1
        tokenCache.set(token, tokenCount)
        return true
      }
      
      return false
    }
  }
}