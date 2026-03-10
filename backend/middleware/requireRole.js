// backend/middleware/requireRole.js
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const userRole = req.user.role;
    
    if (!roles.includes(userRole)) {
      console.log(`❌ Role Access Denied: ${userRole} trying to access ${req.originalUrl}. Allowed: ${roles.join(', ')}`);
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }
    
    console.log(`✅ Role Access Granted: ${userRole} accessing ${req.originalUrl} (Allowed: ${roles.join(', ')})`);
    next();
  };
};

// If you still need requireAdminPageAccess
const requireAdminPageAccess = (pageType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const userRole = req.user.role;
    
    // Super admin can access everything
    if (userRole === 'super_admin') {
      return next();
    }
    
    let hasAccess = false;
    
    switch(pageType) {
      case 'main_admin':
        hasAccess = ['super_admin', 'admin'].includes(userRole);
        break;
      case 'music_admin':
        hasAccess = ['super_admin', 'admin', 'music_admin'].includes(userRole);
        break;
      case 'hall_admin':
        hasAccess = ['super_admin', 'admin', 'hall_admin'].includes(userRole);
        break;
      default:
        hasAccess = false;
    }
    
    if (!hasAccess) {
      console.log(`❌ Page Access Denied: ${userRole} trying to access ${pageType} page`);
      return res.status(403).json({ 
        success: false, 
        message: `Access denied to ${pageType} portal` 
      });
    }
    
    next();
  };
};

module.exports = { requireRole, requireAdminPageAccess };