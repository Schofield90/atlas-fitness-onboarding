UPDATE clients SET
  password_hash = '682b523e655eccde57de5cb6163d44e8:ec6b547c68263ef3314aa6058a9c8c3739830765ea3e62ba7b4c56c3689658c122d2cd12f4fefc8f5ec697581583bd5056df080c09c0c67b0e6e718c202a35a5',
  password_set_at = NOW()
WHERE email = 'samschofield90@hotmail.co.uk';