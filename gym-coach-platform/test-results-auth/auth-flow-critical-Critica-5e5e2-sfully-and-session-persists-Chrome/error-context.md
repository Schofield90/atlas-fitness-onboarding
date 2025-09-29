# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Atlas Fitness" [level=1] [ref=e6]
      - paragraph [ref=e7]: Sign in to your account
    - generic [ref=e8]:
      - button "Continue with Google" [ref=e9] [cursor=pointer]:
        - img [ref=e10] [cursor=pointer]
        - generic [ref=e15] [cursor=pointer]: Continue with Google
      - generic [ref=e20]: Or continue with email
      - generic [ref=e21]:
        - generic [ref=e22]:
          - generic [ref=e23]: Email address
          - textbox "Email address" [ref=e24]
        - button "Send Magic Link" [ref=e25] [cursor=pointer]:
          - img [ref=e26] [cursor=pointer]
          - generic [ref=e29] [cursor=pointer]: Send Magic Link
      - paragraph [ref=e31]:
        - text: Don't have an account?
        - link "Sign up" [ref=e32] [cursor=pointer]:
          - /url: /signup
    - paragraph [ref=e33]:
      - text: By signing in, you agree to our
      - link "Terms of Service" [ref=e34] [cursor=pointer]:
        - /url: /terms
      - text: and
      - link "Privacy Policy" [ref=e35] [cursor=pointer]:
        - /url: /privacy
```