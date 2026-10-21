! mcd_series.F90 -- lowest-model-level series of the Mars Climate Database 6.1 on its native grid
!
!   mcd_series <dset/> <scena> <aps1> <bps1> <timesfile> <outfile>
!
! For every time listed in <timesfile> (outermost loop, so the bracketing monthly datasets load once per month)
! and every node of the native MCD grid except the two pole rows (47 rows 86.25 .. -86.25, 64 columns
! -180 .. 174.375; the nodes become the cell centres of the atlas grid), two call_mcd calls:
!
!   (a) zkey=3, 10 m above the surface, mean state: supplies the GCM surface pressure ps_gcm (extvar 16), the
!       surface pressure used (extvar 15; equal to ps_gcm because hireskey=0), surface temperature (extvar 14),
!       and the check values Ls (extvar 9) and prime-meridian true solar time (extvar 12).
!   (b) zkey=4 at the pressure of the lowest model level, p1 = aps1 + bps1 ps_gcm, lowered by one part in a
!       million (p1 (1 - 1e-6)) so that sigma = p/ps falls just above level 1 and MCD interpolates between levels
!       1 and 2 with a weight of order 1e-6, instead of taking its below-first-level surface-layer (Monin-Obukhov)
!       branch with its own roughness length. Supplies u, v, T, p, rho and the height above the surface (extvar 3).
!
! hireskey = 0: the GCM-resolution fields, so at a grid node the values are those of the native grid (no MOLA
! high-resolution pressure reconstruction, no slope winds). datekey = 1: xdate is Ls (deg) and localtime is the
! true solar time AT THE REQUESTED LONGITUDE: localtime = modulo(ut + lon/15, 24) per point, ut being the
! prime-meridian time of the sample (MCD.F90: "true solar time at longitude lon"; a constant localtime would
! give a constant-local-time map). perturkey = 1: mean state, no perturbations.
!
! timesfile: one line per sample, "sol ls ut"; ls < 0 means Ls = sol2ls(sol) (MCD's own routine, sol 0 = Ls 0).
! Output (stream, little-endian float32), per sample: ls_used, ut_used (extvar 9 and 12 at the first node), then
! 9 fields of (64, 47) in Fortran order (column index fastest): u, v, T, p, rho, z, ps, tsurf, ps_gcm.
! Points with ier /= 0 are NaN, never MCD's -999. <outfile>.meta holds the ier histogram and call count.

program mcd_series

  use MCD
  use, intrinsic :: ieee_arithmetic, only : ieee_value, ieee_quiet_nan

  implicit none

  integer, parameter :: NEXT = 100, NMEAN = 5, NLAT = 47, NLON = 64, NVAR = 9
  real*8,  parameter :: LAT0 = 86.25d0, DLAT = -3.75d0, LON0 = -180.0d0, DLON = 5.625d0

  character(len=512) :: dset, timesfile, outfile, arg
  integer :: scena
  real    :: aps1, bps1

  integer :: extvarkeys(NEXT), ier, ncall, iercount(0:20), ierother
  real    :: xlon, xlat, loct, seedout, pres, dens, temp, zonwind, merwind
  real    :: meanvar(NMEAN), extvar(NEXT)
  real*8  :: xdate
  real    :: sol, ls, ut, p1, nan, lsu, utu
  real    :: f(NLON, NLAT, NVAR)
  integer :: i, j, k, nt, u, uo, ios
  character(len=32) :: cbuf

  nan = ieee_value(0.0, ieee_quiet_nan)

  if (command_argument_count() /= 6) then
     write(*,*) 'usage: mcd_series <dset/> <scena> <aps1> <bps1> <timesfile> <outfile>'
     stop 2
  end if
  call get_command_argument(1, dset)
  call get_command_argument(2, arg); read(arg,*) scena
  call get_command_argument(3, arg); read(arg,*) aps1
  call get_command_argument(4, arg); read(arg,*) bps1
  call get_command_argument(5, timesfile)
  call get_command_argument(6, outfile)
  i = len_trim(dset)
  if (dset(i:i) /= '/') then
     write(*,*) 'dset must end with a slash'
     stop 2
  end if

  extvarkeys = 0
  extvarkeys(14) = 1; extvarkeys(15) = 1; extvarkeys(16) = 1
  iercount = 0; ierother = 0; ncall = 0; nt = 0

  open(newunit=u, file=trim(timesfile), status='old', action='read')
  open(newunit=uo, file=trim(outfile), form='unformatted', access='stream', status='replace', action='write')

  do
     read(u, *, iostat=ios) sol, ls, ut
     if (ios /= 0) exit
     if (ls < 0.0) call sol2ls(sol, ls)
     xdate = dble(ls)
     f = nan; lsu = nan; utu = nan
     do j = 1, NLAT
        xlat = real(LAT0 + DLAT * dble(j - 1))
        do i = 1, NLON
           xlon = real(LON0 + DLON * dble(i - 1))
           loct = modulo(ut + xlon / 15.0, 24.0)
           ! (a) surface call
           call call_mcd(3, 10.0, xlon, xlat, 0, 1, xdate, loct, dset, scena, 1, 1.0, 0.0, extvarkeys, &
                         pres, dens, temp, zonwind, merwind, meanvar, extvar, seedout, ier)
           ncall = ncall + 1; call tally(ier)
           if (ier /= 0) cycle
           f(i,j,7) = extvar(15); f(i,j,8) = extvar(14); f(i,j,9) = extvar(16)
           if (i == 1 .and. j == 1) then
              lsu = extvar(9); utu = extvar(12)
           end if
           ! (b) lowest model level
           p1 = (aps1 + bps1 * extvar(16)) * (1.0 - 1.0e-6)
           call call_mcd(4, p1, xlon, xlat, 0, 1, xdate, loct, dset, scena, 1, 1.0, 0.0, extvarkeys, &
                         pres, dens, temp, zonwind, merwind, meanvar, extvar, seedout, ier)
           ncall = ncall + 1; call tally(ier)
           if (ier /= 0) cycle
           f(i,j,1) = zonwind; f(i,j,2) = merwind; f(i,j,3) = temp
           f(i,j,4) = pres; f(i,j,5) = dens; f(i,j,6) = extvar(3)
        end do
     end do
     write(uo) lsu, utu
     do k = 1, NVAR
        write(uo) f(:,:,k)
     end do
     nt = nt + 1
  end do
  close(u); close(uo)

  open(newunit=u, file=trim(outfile)//'.meta', status='replace', action='write')
  write(u,'(a)')        '# mcd_series extraction metadata'
  write(u,'(a,i0)')     'nt            ', nt
  write(u,'(a,i0)')     'ncall         ', ncall
  write(u,'(a,i0)')     'scena         ', scena
  write(u,'(a,es16.9)') 'aps1          ', aps1
  write(u,'(a,es16.9)') 'bps1          ', bps1
  do k = 0, 20
     if (iercount(k) > 0) then
        write(cbuf,'(a,i0)') 'ier_', k
        write(u,'(a,1x,i0)') trim(cbuf), iercount(k)
     end if
  end do
  write(u,'(a,i0)')     'ier_other     ', ierother
  write(u,'(a)')        'layout        per sample: ls, ut, then u v T p rho z ps tsurf ps_gcm as (64,47) float32'
  write(u,'(a)')        'done'
  close(u)

contains

  subroutine tally(ic)
    integer, intent(in) :: ic
    if (ic >= 0 .and. ic <= 20) then
       iercount(ic) = iercount(ic) + 1
    else
       ierother = ierother + 1
    end if
  end subroutine tally

end program mcd_series
