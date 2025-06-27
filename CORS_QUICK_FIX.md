# 🚨 CORS Quick Fix for Backend

## **Frontend URL to Allow:**
```
https://aimcs-frontend-eastus2.azurewebsites.net
```

## **Missing Header:**
```
access-control-allow-origin: https://aimcs-frontend-eastus2.azurewebsites.net
```

## **Test Command:**
```bash
curl -v -H "Origin: https://aimcs-frontend-eastus2.azurewebsites.net" \
  https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io/health
```

## **Expected Response Headers:**
```
HTTP/2 200
access-control-allow-origin: https://aimcs-frontend-eastus2.azurewebsites.net
access-control-allow-credentials: true
content-type: application/json; charset=utf-8
```

**Priority: HIGH - Frontend cannot connect without this fix** 