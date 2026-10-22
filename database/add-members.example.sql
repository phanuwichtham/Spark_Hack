-- ทำใน Supabase SQL Editor เท่านั้น หลังสร้างบัญชีใน Authentication > Users
-- แก้อีเมลเป็นของทีมจริง ห้ามใส่รหัสผ่านใน SQL/GitHub
insert into public.spark_members(workspace_id,user_id,team_role)
select 'spark-team',id,'admin' from auth.users where email='YOUR_EMAIL@example.com'
on conflict(workspace_id,user_id) do update set team_role=excluded.team_role;

insert into public.spark_members(workspace_id,user_id,team_role)
select 'spark-team',id,'editor' from auth.users where email in (
  'FRIEND_1@example.com','FRIEND_2@example.com'
)
on conflict(workspace_id,user_id) do nothing;

-- ตรวจรายชื่อให้ครบก่อนเปิดใช้งาน (แสดงเฉพาะใน Dashboard ส่วนตัว)
select u.email,m.team_role,m.workspace_id from public.spark_members m
join auth.users u on u.id=m.user_id where m.workspace_id='spark-team';

-- ถอนสิทธิ์ภายหลัง: ตรวจ UUID ให้แน่ใจก่อนดำเนินการ
-- delete from public.spark_members where workspace_id='spark-team' and user_id='USER_UUID';
