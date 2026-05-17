-- Атомарная серверная операция инвестирования.
-- Защита от подмены баланса на клиенте и гонок при параллельных запросах.
create or replace function public.invest_in_idea(p_idea_id bigint, p_amount integer)
returns table(new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_min_bet integer;
  v_balance integer;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  select min_bet
  into v_min_bet
  from public.ideas
  where id = p_idea_id;

  if v_min_bet is null then
    raise exception 'idea_not_found';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  if p_amount < v_min_bet then
    raise exception 'amount_below_min_bet';
  end if;

  update public.profiles
  set spk_balance = spk_balance - p_amount
  where id = v_uid
    and spk_balance >= p_amount
  returning spk_balance into v_balance;

  if v_balance is null then
    raise exception 'insufficient_balance';
  end if;

  return query select v_balance;
end;
$$;

revoke all on function public.invest_in_idea(bigint, integer) from public;
grant execute on function public.invest_in_idea(bigint, integer) to authenticated;
