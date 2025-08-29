# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "Gymleadhub" [ref=e5] [cursor=pointer]:
        - /url: /landing
      - heading "Welcome Back" [level=2] [ref=e6]
      - paragraph [ref=e7]: Sign in to your Gymleadhub account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: Email Address
          - textbox "Email Address" [ref=e12]
        - generic [ref=e13]:
          - generic [ref=e14]: Password
          - textbox "Password" [ref=e15]
      - generic [ref=e16]:
        - generic [ref=e17]:
          - checkbox "Remember me" [ref=e18]
          - generic [ref=e19]: Remember me
        - button "Forgot your password?" [ref=e21] [cursor=pointer]
      - button "Sign In" [ref=e23] [cursor=pointer]
      - generic [ref=e28]: Or continue with
      - button "Sign in with Google" [ref=e30] [cursor=pointer]:
        - img [ref=e31] [cursor=pointer]
        - text: Sign in with Google
      - paragraph [ref=e37]:
        - text: Don't have an account?
        - link "Start your free trial" [ref=e38] [cursor=pointer]:
          - /url: /signup
  - alert [ref=e39]
  - button "Open Next.js Dev Tools" [ref=e45] [cursor=pointer]:
    - img [ref=e46] [cursor=pointer]
```