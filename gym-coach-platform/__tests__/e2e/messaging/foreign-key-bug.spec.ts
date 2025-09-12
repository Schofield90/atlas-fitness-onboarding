import { test, expect, Page } from '@playwright/test';

// E2E tests for the messaging system foreign key constraint bug
// This test simulates the exact bug scenario that was reported:
// 1. Gym owner sends a message to gym goer (creates conversation)
// 2. Gym goer tries to reply but gets "Failed to initialize chat" error
// 3. Console shows foreign key constraint violation for conversation_id

test.describe('Messaging System Foreign Key Constraint Bug', () => {
  let coachPage: Page;
  let clientPage: Page;

  test.beforeEach(async ({ browser }) => {
    // Create two browser contexts for coach and client
    const coachContext = await browser.newContext();
    const clientContext = await browser.newContext();
    
    coachPage = await coachContext.newPage();
    clientPage = await clientContext.newPage();

    // Set up console error monitoring
    coachPage.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Coach console error:', msg.text());
      }
    });

    clientPage.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Client console error:', msg.text());
      }
    });
  });

  test.afterEach(async () => {
    await coachPage?.close();
    await clientPage?.close();
  });

  test('should handle the complete messaging flow without foreign key constraint violations', async () => {
    // Step 1: Coach logs in and navigates to messaging
    await coachPage.goto('/login');
    
    // Mock authentication for coach
    await coachPage.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-coach-token',
        user: {
          id: 'coach-123',
          email: 'coach@gym.com',
          role: 'coach'
        }
      }));
    });

    await coachPage.goto('/dashboard/messages');
    
    // Wait for messages page to load
    await expect(coachPage.locator('[data-testid="messages-container"]')).toBeVisible({ timeout: 10000 });

    // Step 2: Coach initiates conversation with client
    await coachPage.click('[data-testid="new-conversation-btn"]');
    
    // Select client from dropdown
    await coachPage.click('[data-testid="client-select"]');
    await coachPage.click('[data-testid="client-option-client-123"]');
    
    // Create conversation
    await coachPage.click('[data-testid="create-conversation-btn"]');
    
    // Wait for conversation to be created
    await expect(coachPage.locator('[data-testid="conversation-conv-"]')).toBeVisible();

    // Step 3: Coach sends initial message
    const conversationId = await coachPage.getAttribute('[data-testid^="conversation-conv-"]', 'data-conversation-id');
    
    await coachPage.click(`[data-testid="conversation-${conversationId}"]`);
    
    // Wait for chat interface to load
    await expect(coachPage.locator('[data-testid="message-composer"]')).toBeVisible();
    
    const initialMessage = "Hi! How is your workout progress going?";
    await coachPage.fill('[data-testid="message-input"]', initialMessage);
    await coachPage.click('[data-testid="send-message-btn"]');
    
    // Verify message was sent
    await expect(coachPage.locator(`[data-testid="message-content"]:has-text("${initialMessage}")`)).toBeVisible();

    // Step 4: Client logs in (this is where the bug typically occurred)
    await clientPage.goto('/login');
    
    // Mock authentication for client
    await clientPage.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-client-token',
        user: {
          id: 'client-456',
          email: 'client@example.com',
          role: 'client'
        }
      }));
    });

    await clientPage.goto('/client/messages');
    
    // Wait for client messages page to load
    await expect(clientPage.locator('[data-testid="client-messages-container"]')).toBeVisible({ timeout: 10000 });

    // Step 5: Client attempts to reply (bug reproduction scenario)
    await clientPage.click(`[data-testid="conversation-${conversationId}"]`);
    
    // Wait for chat interface to load - this should NOT show "Failed to initialize chat"
    await expect(clientPage.locator('[data-testid="message-composer"]')).toBeVisible({ timeout: 15000 });
    
    // Verify that the conversation loads properly and shows coach's message
    await expect(clientPage.locator(`[data-testid="message-content"]:has-text("${initialMessage}")`)).toBeVisible();

    // Step 6: Client sends reply (the critical test)
    const replyMessage = "Great! I just finished my leg day workout.";
    await clientPage.fill('[data-testid="message-input"]', replyMessage);
    
    // Monitor for any console errors during message sending
    const consoleErrors: string[] = [];
    clientPage.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('foreign key')) {
        consoleErrors.push(msg.text());
      }
    });

    await clientPage.click('[data-testid="send-message-btn"]');
    
    // Verify reply was sent successfully without errors
    await expect(clientPage.locator(`[data-testid="message-content"]:has-text("${replyMessage}")`)).toBeVisible({ timeout: 10000 });
    
    // Verify no foreign key constraint errors occurred
    expect(consoleErrors).toEqual([]);
    
    // Verify no error messages are shown in the UI
    await expect(clientPage.locator('[data-testid="error-message"]')).not.toBeVisible();
    await expect(clientPage.locator(':has-text("Failed to initialize chat")')).not.toBeVisible();

    // Step 7: Verify message appears on coach's side
    await coachPage.reload();
    await coachPage.click(`[data-testid="conversation-${conversationId}"]`);
    
    // Both messages should be visible to coach
    await expect(coachPage.locator(`[data-testid="message-content"]:has-text("${initialMessage}")`)).toBeVisible();
    await expect(coachPage.locator(`[data-testid="message-content"]:has-text("${replyMessage}")`)).toBeVisible();
  });

  test('should handle network failures during conversation creation gracefully', async () => {
    await coachPage.goto('/login');
    
    await coachPage.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-coach-token',
        user: { id: 'coach-123', email: 'coach@gym.com', role: 'coach' }
      }));
    });

    await coachPage.goto('/dashboard/messages');

    // Intercept conversation creation API call and make it fail
    await coachPage.route('/api/conversations', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to create conversation',
          details: 'Network connection timeout'
        })
      });
    });

    await coachPage.click('[data-testid="new-conversation-btn"]');
    await coachPage.click('[data-testid="client-select"]');
    await coachPage.click('[data-testid="client-option-client-123"]');
    await coachPage.click('[data-testid="create-conversation-btn"]');

    // Should show error message
    await expect(coachPage.locator('[data-testid="error-message"]:has-text("Failed to create conversation")')).toBeVisible();

    // Remove the route to allow retry
    await coachPage.unroute('/api/conversations');
    
    // Mock successful response for retry
    await coachPage.route('/api/conversations', route => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          conversation: {
            id: 'conv-retry-123',
            title: 'Test Client',
            status: 'active',
            clients: { id: 'client-123', name: 'Test Client', email: 'client@example.com' }
          }
        })
      });
    });

    // Retry conversation creation
    await coachPage.click('[data-testid="retry-create-conversation-btn"]');
    
    // Should succeed this time
    await expect(coachPage.locator('[data-testid="conversation-conv-retry-123"]')).toBeVisible();
  });

  test('should prevent message sending when conversation verification fails', async () => {
    await clientPage.goto('/login');
    
    await clientPage.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-client-token',
        user: { id: 'client-456', email: 'client@example.com', role: 'client' }
      }));
    });

    await clientPage.goto('/client/messages');

    // Simulate a conversation that exists in the UI but not in the database (stale data)
    await clientPage.evaluate(() => {
      // Add a fake conversation to the UI state
      const conversationElement = document.createElement('div');
      conversationElement.setAttribute('data-testid', 'conversation-fake-conv-123');
      conversationElement.setAttribute('data-conversation-id', 'fake-conv-123');
      conversationElement.textContent = 'Fake Conversation';
      conversationElement.style.cursor = 'pointer';
      document.querySelector('[data-testid="client-messages-container"]')?.appendChild(conversationElement);
      
      conversationElement.addEventListener('click', () => {
        // Simulate clicking on the fake conversation
        const chatContainer = document.createElement('div');
        chatContainer.setAttribute('data-testid', 'message-composer');
        chatContainer.innerHTML = `
          <input data-testid="message-input" type="text" placeholder="Type a message...">
          <button data-testid="send-message-btn">Send</button>
        `;
        document.body.appendChild(chatContainer);
      });
    });

    // Click on the fake conversation
    await clientPage.click('[data-testid="conversation-fake-conv-123"]');
    await expect(clientPage.locator('[data-testid="message-composer"]')).toBeVisible();

    // Intercept message sending to return conversation not found error
    await clientPage.route('/api/conversations/fake-conv-123/messages', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Conversation not found'
        })
      });
    });

    // Attempt to send message
    await clientPage.fill('[data-testid="message-input"]', 'This should fail');
    await clientPage.click('[data-testid="send-message-btn"]');

    // Should show error message and not send the message
    await expect(clientPage.locator('[data-testid="error-message"]:has-text("Conversation not found")')).toBeVisible();
    
    // Message should not appear in the chat
    await expect(clientPage.locator('[data-testid="message-content"]:has-text("This should fail")')).not.toBeVisible();
  });

  test('should handle concurrent conversation creation attempts', async () => {
    await coachPage.goto('/login');
    
    await coachPage.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-coach-token',
        user: { id: 'coach-123', email: 'coach@gym.com', role: 'coach' }
      }));
    });

    await coachPage.goto('/dashboard/messages');

    // Mock the API to simulate race condition handling
    let callCount = 0;
    await coachPage.route('/api/conversations', route => {
      callCount++;
      const conversationId = 'conv-race-test-123';
      
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          conversation: {
            id: conversationId,
            title: 'Race Test Client',
            status: 'active',
            clients: { id: 'client-123', name: 'Race Test Client', email: 'client@example.com' }
          }
        })
      });
    });

    // Open multiple conversation creation dialogs rapidly
    const createConversationPromises = [];
    
    for (let i = 0; i < 3; i++) {
      const promise = (async () => {
        await coachPage.click('[data-testid="new-conversation-btn"]');
        await coachPage.click('[data-testid="client-select"]');
        await coachPage.click('[data-testid="client-option-client-123"]');
        await coachPage.click('[data-testid="create-conversation-btn"]');
      })();
      
      createConversationPromises.push(promise);
    }

    // Wait for all attempts to complete
    await Promise.all(createConversationPromises);

    // Should only create one conversation despite multiple attempts
    const conversations = await coachPage.locator('[data-testid^="conversation-conv-race-test-"]').count();
    expect(conversations).toBe(1);
  });

  test('should properly synchronize conversation creation before message sending', async () => {
    await coachPage.goto('/login');
    
    await coachPage.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-coach-token',
        user: { id: 'coach-123', email: 'coach@gym.com', role: 'coach' }
      }));
    });

    await coachPage.goto('/dashboard/messages');

    // Mock conversation creation with a delay to test synchronization
    await coachPage.route('/api/conversations', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          conversation: {
            id: 'conv-sync-test-123',
            title: 'Sync Test Client',
            status: 'active',
            clients: { id: 'client-123', name: 'Sync Test Client', email: 'client@example.com' }
          }
        })
      });
    });

    // Mock message sending to verify conversation ID is properly passed
    let messageConversationId: string | null = null;
    await coachPage.route('/api/conversations/*/messages', route => {
      messageConversationId = route.request().url().split('/')[5]; // Extract conversation ID from URL
      
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: {
            id: 'msg-sync-test-123',
            content: 'Test sync message',
            sender_type: 'coach',
            created_at: new Date().toISOString()
          }
        })
      });
    });

    // Create conversation
    await coachPage.click('[data-testid="new-conversation-btn"]');
    await coachPage.click('[data-testid="client-select"]');
    await coachPage.click('[data-testid="client-option-client-123"]');
    await coachPage.click('[data-testid="create-conversation-btn"]');

    // Wait for conversation to be created
    await expect(coachPage.locator('[data-testid="conversation-conv-sync-test-123"]')).toBeVisible();

    // Immediately try to send a message
    await coachPage.click('[data-testid="conversation-conv-sync-test-123"]');
    await expect(coachPage.locator('[data-testid="message-composer"]')).toBeVisible();

    const testMessage = 'Test sync message';
    await coachPage.fill('[data-testid="message-input"]', testMessage);
    await coachPage.click('[data-testid="send-message-btn"]');

    // Verify message was sent with correct conversation ID
    await expect(coachPage.locator(`[data-testid="message-content"]:has-text("${testMessage}")`)).toBeVisible();
    expect(messageConversationId).toBe('conv-sync-test-123');
  });

  test('should display appropriate error messages for different failure scenarios', async () => {
    await clientPage.goto('/login');
    
    await clientPage.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-client-token',
        user: { id: 'client-456', email: 'client@example.com', role: 'client' }
      }));
    });

    await clientPage.goto('/client/messages');

    const scenarios = [
      {
        name: 'Network timeout',
        route: '/api/conversations/test-conv/messages',
        response: { status: 408, body: { error: 'Request timeout' } },
        expectedError: 'Request timeout'
      },
      {
        name: 'Server error',
        route: '/api/conversations/test-conv/messages',
        response: { status: 500, body: { error: 'Internal server error' } },
        expectedError: 'Internal server error'
      },
      {
        name: 'Unauthorized access',
        route: '/api/conversations/test-conv/messages',
        response: { status: 403, body: { error: 'Access denied' } },
        expectedError: 'Access denied'
      },
      {
        name: 'Foreign key constraint violation',
        route: '/api/conversations/test-conv/messages',
        response: { 
          status: 500, 
          body: { 
            error: 'Failed to send message',
            details: 'Foreign key constraint violation'
          }
        },
        expectedError: 'Failed to send message'
      }
    ];

    for (const scenario of scenarios) {
      // Setup conversation UI
      await clientPage.evaluate((conversationId) => {
        const conversationElement = document.createElement('div');
        conversationElement.setAttribute('data-testid', `conversation-${conversationId}`);
        conversationElement.setAttribute('data-conversation-id', conversationId);
        conversationElement.textContent = `Test Conversation ${conversationId}`;
        conversationElement.style.cursor = 'pointer';
        
        const container = document.querySelector('[data-testid="client-messages-container"]');
        if (container) {
          container.innerHTML = ''; // Clear previous
          container.appendChild(conversationElement);
        }
        
        conversationElement.addEventListener('click', () => {
          const chatContainer = document.createElement('div');
          chatContainer.setAttribute('data-testid', 'message-composer');
          chatContainer.innerHTML = `
            <input data-testid="message-input" type="text" placeholder="Type a message...">
            <button data-testid="send-message-btn">Send</button>
            <div data-testid="error-message" style="display: none;"></div>
          `;
          
          const existingComposer = document.querySelector('[data-testid="message-composer"]');
          if (existingComposer) {
            existingComposer.remove();
          }
          
          document.body.appendChild(chatContainer);
        });
      }, 'test-conv');

      // Setup route for this scenario
      await clientPage.route(scenario.route, route => {
        route.fulfill({
          status: scenario.response.status,
          contentType: 'application/json',
          body: JSON.stringify(scenario.response.body)
        });
      });

      // Test the scenario
      await clientPage.click('[data-testid="conversation-test-conv"]');
      await expect(clientPage.locator('[data-testid="message-composer"]')).toBeVisible();
      
      await clientPage.fill('[data-testid="message-input"]', `Test message for ${scenario.name}`);
      await clientPage.click('[data-testid="send-message-btn"]');

      // Verify appropriate error message is shown
      await expect(clientPage.locator(`[data-testid="error-message"]:has-text("${scenario.expectedError}")`)).toBeVisible({ timeout: 5000 });

      await clientPage.unroute(scenario.route);
    }
  });
});