-- The zero-argument overload was replaced by sov_budget_info(uuid); dropping it
-- so calls are not ambiguous.
DROP FUNCTION public.sov_budget_info();