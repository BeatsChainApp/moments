-- Fix existing subscriptions with full region names to use codes
UPDATE subscriptions
SET regions = ARRAY(
  SELECT CASE 
      WHEN unnest = 'KwaZulu-Natal' THEN 'KZN'
          WHEN unnest = 'Western Cape' THEN 'WC'
              WHEN unnest = 'Gauteng' THEN 'GP'
                  WHEN unnest = 'Eastern Cape' THEN 'EC'
                      WHEN unnest = 'Free State' THEN 'FS'
                          WHEN unnest = 'Limpopo' THEN 'LP'
                              WHEN unnest = 'Mpumalanga' THEN 'MP'
                                  WHEN unnest = 'Northern Cape' THEN 'NC'
                                      WHEN unnest = 'North West' THEN 'NW'
                                          ELSE unnest
                                            END
                                              FROM unnest(regions)
                                              )
                                              WHERE EXISTS (
                                                SELECT 1 FROM unnest(regions) r 
                                                  WHERE r IN ('KwaZulu-Natal', 'Western Cape', 'Gauteng', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West')
                                                  );
                                                  