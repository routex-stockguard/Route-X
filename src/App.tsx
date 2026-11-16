import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  LogOut,
  Menu,
  PlusCircle,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from 'lucide-react';
import {
  CostBreakdown,
  CurrentUser,
  formatCurrency,
  getTotalRequestCost,
  INITIAL_PRODUCTS,
  INITIAL_REQUESTS,
  INITIAL_SITE_CONFIG,
  INITIAL_USERS,
  INITIAL_WAREHOUSES,
  InspectionRecord,
  Product,
  RETURN_REASONS,
  ReturnRequest,
  ReturnStatus,
  Role,
  SiteConfig,
  StaffUser,
  SystemNotification,
  TabId,
  ToastMessage,
  WarehouseInfo,
} from './types';
import { AuthPortal } from './components/AuthPortal';
import { DashboardView } from './components/DashboardView';
import { RequestsView } from './components/RequestsView';
import { NewRequestFormValues, NewRequestView } from './components/NewRequestView';
import { TrackingView } from './components/TrackingView';
import { WarehouseView } from './components/WarehouseView';
import { InspectionView } from './components/InspectionView';
import { CostManagementView } from './components/CostManagementView';
import { UserManagementView } from './components/UserManagementView';
import { SiteSettingsView } from './components/SiteSettingsView';
import { StaffVerifyModal } from './components/StaffVerifyModal';
import { ResilientImage, StatusIndicator } from './components/StatusText';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  requireLevel1?: boolean;
}

interface PendingVerification {
  actionLabel: string;
  onConfirm: (verifiedUser: StaffUser) => void;
}

const ROLE_NAV_MAP: Record<Role, NavItem[]> = {
  Admin: [
    { id: 'dashboard', label: 'Dashboard ภาพรวม', icon: BarChart3 },
    { id: 'requests', label: 'รายการคืนสินค้าทั้งหมด', icon: ClipboardList },
    { id: 'tracking', label: 'ติดตามสถานะ (7-Steps)', icon: Clock },
    { id: 'warehouse', label: 'คลังสินค้า & รับของเข้า', icon: Warehouse },
    { id: 'inspection', label: 'ศูนย์ตรวจสอบสภาพสินค้า', icon: ShieldCheck },
    { id: 'costs', label: 'บริหารต้นทุนคืนสินค้า', icon: DollarSign },
    {
      id: 'user-management',
      label: 'จัดการผู้ใช้งาน (Admin 1)',
      icon: Shield,
      requireLevel1: true,
    },
    {
      id: 'site-settings',
      label: 'เปลี่ยนแปลง & เพิ่มรายละเอียด',
      icon: SlidersHorizontal,
      requireLevel1: true,
    },
  ],
  Customer: [
    { id: 'new-request', label: 'ยื่นคำขอคืนสินค้า', icon: PlusCircle },
    { id: 'tracking', label: 'ติดตามสถานะพัสดุคืน', icon: Clock },
  ],
  'Warehouse Staff': [
    { id: 'warehouse', label: 'รับสินค้าคืนเข้าคลัง', icon: Warehouse },
    { id: 'requests', label: 'รายการพัสดุทั้งหมด', icon: ClipboardList },
  ],
  Inspector: [
    { id: 'inspection', label: 'ตรวจสภาพ & ประเมินงาน', icon: ShieldCheck },
    { id: 'requests', label: 'รายการพัสดุทั้งหมด', icon: ClipboardList },
  ],
};

function formatNow(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [users, setUsers] = useState<StaffUser[]>(() =>
    loadStored('routex_users', INITIAL_USERS)
  );
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() =>
    loadStored('routex_site_config', INITIAL_SITE_CONFIG)
  );
  const [returnReasons, setReturnReasons] = useState<string[]>(() =>
    loadStored('routex_return_reasons', RETURN_REASONS)
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [requests, setRequests] = useState<ReturnRequest[]>(() =>
    loadStored('routex_requests', INITIAL_REQUESTS)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadStored('routex_products', INITIAL_PRODUCTS)
  );
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>(INITIAL_WAREHOUSES);

  useEffect(() => {
    try {
      window.localStorage.setItem('routex_users', JSON.stringify(users));
    } catch {
      // ignore storage quota errors
    }
  }, [users]);

  useEffect(() => {
    try {
      window.localStorage.setItem('routex_site_config', JSON.stringify(siteConfig));
    } catch {
      // ignore storage quota errors
    }
  }, [siteConfig]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'routex_return_reasons',
        JSON.stringify(returnReasons)
      );
    } catch {
      // ignore storage quota errors
    }
  }, [returnReasons]);

  useEffect(() => {
    try {
      window.localStorage.setItem('routex_products', JSON.stringify(products));
    } catch {
      // ignore storage quota errors
    }
  }, [products]);

  useEffect(() => {
    try {
      window.localStorage.setItem('routex_requests', JSON.stringify(requests));
    } catch {
      // ignore storage quota errors
    }
  }, [requests]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    INITIAL_REQUESTS[0]?.id || ''
  );
  const [modalRequest, setModalRequest] = useState<ReturnRequest | null>(null);
  const [pendingVerify, setPendingVerify] = useState<PendingVerification | null>(null);

  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 1,
      requestId: 'RTX-20261112-0002',
      text: 'คำร้อง RTX-20261112-0002 อยู่ระหว่างตรวจสอบสภาพสินค้าที่คลัง WH-BKK-01',
      time: '10 นาทีที่แล้ว',
      type: 'info',
    },
    {
      id: 2,
      requestId: 'RTX-20261110-0001',
      text: 'แจ้งเตือนสินค้าคืน RTX-20261110-0001 ค้างดำเนินการเกิน 3 วัน',
      time: '1 ชั่วโมงที่แล้ว',
      type: 'warning',
    },
  ]);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (msg: string, type: ToastMessage['type'] = 'success') => {
    setToast({ msg, type });
    window.setTimeout(() => {
      setToast((current) => (current?.msg === msg ? null : current));
    }, 3800);
  };

  const addNotification = (
    text: string,
    type: SystemNotification['type'] = 'info',
    requestId?: string
  ) => {
    setNotifications((prev) => [
      { id: Date.now(), text, time: 'เมื่อสักครู่', type, requestId },
      ...prev,
    ]);
  };

  const enterWorkspaceForRole = (role: Role) => {
    setSidebarOpen(false);
    if (role === 'Customer') {
      setActiveTab('new-request');
    } else if (role === 'Warehouse Staff') {
      setActiveTab('warehouse');
    } else if (role === 'Inspector') {
      setActiveTab('inspection');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleStaffLogin = (employeeId: string, password: string): string | null => {
    const found = users.find(
      (u) => u.employeeId === employeeId && u.password === password
    );
    if (!found) {
      return 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
    }
    setCurrentUser({
      employeeId: found.employeeId,
      name: found.name,
      role: found.role,
      level: found.level,
    });
    enterWorkspaceForRole(found.role);
    showToast(`เข้าสู่ระบบสำเร็จ: ${found.name} (${found.role})`, 'success');
    return null;
  };

  const handleCustomerEnter = () => {
    setCurrentUser({
      name: 'ลูกค้าทั่วไป',
      role: 'Customer',
      level: 0,
    });
    enterWorkspaceForRole('Customer');
    showToast('เข้าสู่พอร์ทัลลูกค้าเรียบร้อยแล้ว', 'info');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSidebarOpen(false);
    setModalRequest(null);
    setPendingVerify(null);
  };

  const requestStaffVerification = (
    actionLabel: string,
    onConfirm: (verifiedUser: StaffUser) => void
  ) => {
    setPendingVerify({ actionLabel, onConfirm });
  };

  const handleCreateUser = (
    newUser: Omit<StaffUser, 'level'>,
    onSuccess: () => void
  ): string | null => {
    if (users.some((u) => u.employeeId.toLowerCase() === newUser.employeeId.toLowerCase())) {
      return `รหัสพนักงาน ${newUser.employeeId} มีอยู่ในระบบแล้ว`;
    }

    requestStaffVerification(
      `สร้างบัญชีพนักงานใหม่ ${newUser.employeeId} (${newUser.role})`,
      (verifiedUser) => {
        setUsers((prev) => [...prev, { ...newUser, level: 2 }]);
        addNotification(
          `${verifiedUser.name} (${verifiedUser.employeeId}) เพิ่มบัญชีพนักงาน ${newUser.employeeId}`,
          'success'
        );
        showToast(`สร้างบัญชีพนักงาน ${newUser.employeeId} เรียบร้อยแล้ว`);
        onSuccess();
      }
    );
    return null;
  };

  const handleDeleteUser = (employeeId: string) => {
    requestStaffVerification(
      `ลบบัญชีพนักงานรหัส ${employeeId}`,
      (verifiedUser) => {
        setUsers((prev) =>
          prev.filter((u) => u.employeeId !== employeeId || u.level === 1)
        );
        addNotification(
          `${verifiedUser.name} (${verifiedUser.employeeId}) ลบบัญชีพนักงาน ${employeeId}`,
          'info'
        );
        showToast(`ลบบัญชีพนักงาน ${employeeId} ออกจากระบบแล้ว`, 'info');
      }
    );
  };

  const handleSaveSiteConfig = (nextConfig: SiteConfig, label: string) => {
    requestStaffVerification(label, (verifiedUser) => {
      setSiteConfig(nextConfig);
      addNotification(
        `${verifiedUser.name} (${verifiedUser.employeeId}) ${label}`,
        'success'
      );
      showToast(`${label}เรียบร้อยแล้ว`);
    });
  };

  const handleResetSiteConfig = () => {
    requestStaffVerification(
      'คืนค่าการตั้งค่าเว็บไซต์และรายการสินค้าเป็นค่าเริ่มต้น',
      (verifiedUser) => {
        setSiteConfig(INITIAL_SITE_CONFIG);
        setProducts(INITIAL_PRODUCTS);
        setReturnReasons(RETURN_REASONS);
        addNotification(
          `${verifiedUser.name} (${verifiedUser.employeeId}) คืนค่าข้อมูลเว็บไซต์เริ่มต้น`,
          'info'
        );
        showToast('คืนค่าข้อมูลเว็บไซต์เริ่มต้นเรียบร้อยแล้ว', 'info');
      }
    );
  };

  const handleAddProduct = (
    product: Product,
    onSuccess: () => void
  ): string | null => {
    if (products.some((p) => p.sku.toLowerCase() === product.sku.toLowerCase())) {
      return `รหัส SKU ${product.sku} มีอยู่ในระบบแล้ว`;
    }
    requestStaffVerification(
      `เพิ่มสินค้าใหม่ ${product.sku} (${product.name})`,
      (verifiedUser) => {
        setProducts((prev) => [...prev, product]);
        addNotification(
          `${verifiedUser.name} (${verifiedUser.employeeId}) เพิ่มสินค้า ${product.sku}`,
          'success'
        );
        showToast(`เพิ่มสินค้า ${product.sku} เข้าระบบเรียบร้อยแล้ว`);
        onSuccess();
      }
    );
    return null;
  };

  const handleDeleteProduct = (sku: string) => {
    requestStaffVerification(`ลบสินค้า SKU ${sku} ออกจากรายการ`, (verifiedUser) => {
      setProducts((prev) => prev.filter((p) => p.sku !== sku));
      addNotification(
        `${verifiedUser.name} (${verifiedUser.employeeId}) ลบสินค้า ${sku}`,
        'info'
      );
      showToast(`ลบสินค้า ${sku} ออกจากรายการแล้ว`, 'info');
    });
  };

  const handleUpdateReturnReasons = (nextReasons: string[], label: string) => {
    requestStaffVerification(label, (verifiedUser) => {
      setReturnReasons(nextReasons);
      addNotification(
        `${verifiedUser.name} (${verifiedUser.employeeId}) ${label}`,
        'info'
      );
      showToast(`${label}เรียบร้อยแล้ว`);
    });
  };

  const generateRequestId = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = String(Math.floor(Math.random() * 9000) + 1000);
    return `RTX-${dateStr}-${randomSeq}`;
  };

  const handleCreateRequest = (values: NewRequestFormValues) => {
    const product = products.find((p) => p.sku === values.sku) || products[0];
    const newId = generateRequestId();
    const todayStr = new Date().toISOString().split('T')[0];
    const actorName = values.customerName.trim() || currentUser?.name || 'ลูกค้าทั่วไป';

    const executeCreate = (verifiedActor: string) => {
      const created: ReturnRequest = {
        id: newId,
        orderNumber: values.orderNumber.trim(),
        customerName: values.customerName.trim(),
        customerPhone: values.customerPhone.trim(),
        customerEmail: values.customerEmail.trim(),
        purchaseDate: values.purchaseDate,
        requestDate: todayStr,
        sku: product.sku,
        productName: product.name,
        qty: values.qty,
        unitPrice: product.price,
        reason: values.reason,
        detail: values.detail.trim() || 'ไม่มีรายละเอียดเพิ่มเติม',
        imageUrl: values.imageUrl || product.imageUrl,
        status: 'รออนุมัติคำขอคืนสินค้า',
        warehouseId: 'WH-BKK-01',
        locationBin: 'PENDING-BIN',
        receivedDate: '',
        agingDays: 0,
        inspection: null,
        resolution:
          values.resolutionType === 'reship'
            ? {
                type: 'reship',
                reshipName: values.reshipName.trim(),
                reshipAddress: values.reshipAddress.trim(),
                reshipPhone: values.reshipPhone.trim(),
              }
            : {
                type: 'refund',
                refundBankName: values.refundBankName,
                refundAccountName: values.refundAccountName.trim(),
                refundAccountNumber: values.refundAccountNumber.trim(),
              },
        costs: {
          freight: 85,
          repair: 0,
          inspectionFee: 50,
          assetLoss: 0,
        },
        timeline: [
          {
            status: 'รออนุมัติคำขอคืนสินค้า',
            date: formatNow(),
            actor: verifiedActor,
            note:
              values.resolutionType === 'reship'
                ? `ยื่นคำร้องขอคืนสินค้า (ต้องการจัดส่งสินค้าใหม่ถึง ${values.reshipName.trim()})`
                : `ยื่นคำร้องขอคืนสินค้า (ต้องการรับเงินคืนเข้าบัญชี ${values.refundAccountName.trim()})`,
          },
        ],
      };

      setRequests((prev) => [created, ...prev]);
      setSelectedRequestId(created.id);
      setActiveTab('tracking');
      addNotification(
        `คำร้องคืนสินค้าใหม่ ${created.id} จาก ${created.customerName}`,
        'info',
        created.id
      );
      showToast(`ส่งคำขอคืนสินค้าเรียบร้อย รหัสติดตาม ${created.id}`);
    };

    if (currentUser && currentUser.role !== 'Customer') {
      requestStaffVerification(`สร้างคำขอคืนสินค้าให้ ${values.customerName}`, (verifiedUser) => {
        executeCreate(`${verifiedUser.name} (${verifiedUser.employeeId})`);
      });
    } else {
      executeCreate(actorName);
    }
  };

  const handleUpdateStatus = (id: string, nextStatus: ReturnStatus) => {
    requestStaffVerification(
      `เปลี่ยนสถานะคำร้อง ${id} เป็น "${nextStatus}"`,
      (verifiedUser) => {
        const actor = `${verifiedUser.name} (${verifiedUser.employeeId})`;
        const timestamp = formatNow();
        const note =
          nextStatus === 'ปฏิเสธคำขอคืนสินค้า'
            ? 'ปฏิเสธคำขอคืนสินค้า'
            : `อัปเดตสถานะเป็น ${nextStatus}`;

        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: nextStatus,
                  timeline: [
                    ...r.timeline,
                    { status: nextStatus, date: timestamp, actor, note },
                  ],
                }
              : r
          )
        );
        setModalRequest((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                status: nextStatus,
                timeline: [
                  ...prev.timeline,
                  { status: nextStatus, date: timestamp, actor, note },
                ],
              }
            : prev
        );
        addNotification(`อัปเดตสถานะ ${id} เป็น "${nextStatus}" โดย ${actor}`, 'info', id);
        showToast(`อัปเดตสถานะ ${id} เรียบร้อยแล้ว`);
      }
    );
  };

  const handleReceiveWarehouse = (
    requestId: string,
    warehouseId: string,
    locationBin: string
  ) => {
    const cleanBin = locationBin.trim() || 'RACK-A01';
    requestStaffVerification(
      `ยืนยันรับพัสดุ ${requestId} เข้าคลัง ${warehouseId} (${cleanBin})`,
      (verifiedUser) => {
        const nowStr = formatNow();
        const actor = `${verifiedUser.name} (${verifiedUser.employeeId})`;
        const targetReq = requests.find((r) => r.id === requestId);
        const qtyToAdd = targetReq?.qty || 1;

        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  warehouseId,
                  locationBin: cleanBin,
                  receivedDate: nowStr,
                  status: 'ได้รับสินค้าแล้ว',
                  timeline: [
                    ...r.timeline,
                    {
                      status: 'ได้รับสินค้าแล้ว',
                      date: nowStr,
                      actor,
                      note: `รับเข้าคลัง ${warehouseId} ช่อง ${cleanBin}`,
                    },
                  ],
                }
              : r
          )
        );

        setWarehouses((prev) =>
          prev.map((w) =>
            w.id === warehouseId
              ? { ...w, occupied: Math.min(w.capacity, w.occupied + qtyToAdd) }
              : w
          )
        );

        addNotification(
          `คลัง ${warehouseId} รับพัสดุ ${requestId} เข้าช่อง ${cleanBin} โดย ${actor}`,
          'success',
          requestId
        );
        showToast(`รับพัสดุ ${requestId} เข้าคลัง ${warehouseId} (${cleanBin}) สำเร็จ`);
      }
    );
  };

  const handleDispatchToCustomer = (
    requestId: string,
    trackingNumber: string,
    productName: string,
    carrier: string,
    closeAfterDispatch: boolean,
    onSuccess: () => void
  ) => {
    requestStaffVerification(
      `ส่งพัสดุถึงลูกค้า (${requestId}) · เลขพัสดุ ${trackingNumber} · สินค้า ${productName}`,
      (verifiedUser) => {
        const nowStr = formatNow();
        const actor = `${verifiedUser.name} (${verifiedUser.employeeId})`;
        const nextStatus: ReturnStatus = closeAfterDispatch
          ? 'ตรวจสอบเสร็จสิ้น / ปิดรายการ'
          : 'คืนเงิน / เปลี่ยนสินค้า';

        const dispatchRecord = {
          trackingNumber,
          productName,
          carrier,
          shippedAt: nowStr,
          shippedBy: actor,
        };

        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: nextStatus,
                  outboundDispatch: dispatchRecord,
                  timeline: [
                    ...r.timeline,
                    {
                      status: nextStatus,
                      date: nowStr,
                      actor,
                      note: `จัดส่งพัสดุถึงลูกค้า (${carrier}) · เลขพัสดุ ${trackingNumber} · สินค้า: ${productName}`,
                    },
                  ],
                }
              : r
          )
        );

        addNotification(
          `${actor} ส่งพัสดุ ${trackingNumber} (${productName}) ให้ลูกค้าคำร้อง ${requestId}`,
          'success',
          requestId
        );
        showToast(`บันทึกการจัดส่งพัสดุ ${trackingNumber} ถึงลูกค้าสำเร็จ`);
        onSuccess();
      }
    );
  };

  const handleCompleteInspection = (
    requestId: string,
    record: InspectionRecord,
    closeNow: boolean
  ) => {
    requestStaffVerification(
      `บันทึกผลตรวจสภาพสินค้า ${requestId} (${record.disposition})`,
      (verifiedUser) => {
        const targetReq = requests.find((r) => r.id === requestId);
        const nextStatus: ReturnStatus = closeNow
          ? 'ตรวจสอบเสร็จสิ้น / ปิดรายการ'
          : 'คืนเงิน / เปลี่ยนสินค้า';
        const timestamp = formatNow();
        const actor = `${verifiedUser.name} (${verifiedUser.employeeId})`;

        setRequests((prev) =>
          prev.map((r) => {
            if (r.id !== requestId) return r;
            return {
              ...r,
              status: nextStatus,
              inspection: {
                ...record,
                inspectorName: actor,
              },
              costs: {
                ...r.costs,
                repair: record.repairCost,
                assetLoss:
                  record.disposition === 'ตัดจำหน่ายเป็นสินค้าเสียหาย'
                    ? record.damagedValue
                    : r.costs.assetLoss,
              },
              timeline: [
                ...r.timeline,
                {
                  status: nextStatus,
                  date: timestamp,
                  actor,
                  note: `${record.grade} · ${record.disposition}`,
                },
              ],
            };
          })
        );

        if (targetReq && record.disposition === 'นำกลับเข้าสต็อก') {
          setProducts((prev) =>
            prev.map((p) =>
              p.sku === targetReq.sku ? { ...p, stock: p.stock + targetReq.qty } : p
            )
          );
        }

        addNotification(
          `ตรวจสภาพ ${requestId} เสร็จสิ้น (${record.disposition}) โดย ${actor}`,
          'success',
          requestId
        );
        showToast(`บันทึกผลตรวจสภาพ ${requestId} เรียบร้อยแล้ว`);
      }
    );
  };

  const handleUpdateCost = (
    requestId: string,
    nextCosts: CostBreakdown,
    onSuccess: () => void
  ) => {
    requestStaffVerification(
      `แก้ไขและบันทึกต้นทุนคำร้อง ${requestId}`,
      (verifiedUser) => {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, costs: nextCosts } : r))
        );
        addNotification(
          `${verifiedUser.name} (${verifiedUser.employeeId}) อัปเดตต้นทุน ${requestId}`,
          'info',
          requestId
        );
        showToast(`อัปเดตข้อมูลต้นทุนสำหรับ ${requestId} เรียบร้อยแล้ว`);
        onSuccess();
      }
    );
  };

  const handleExportCSV = () => {
    requestStaffVerification('ส่งออกรายงานข้อมูลคำร้องคืนสินค้า (CSV)', (verifiedUser) => {
      const headers = [
        'Request ID',
        'Order Number',
        'Customer',
        'SKU',
        'Product',
        'Qty',
        'Unit Price',
        'Reason',
        'Status',
        'Warehouse',
        'Bin',
        'Freight Cost',
        'Inspection Fee',
        'Repair Cost',
        'Asset Loss',
        'Total Cost',
      ];
      const rows = requests.map((r) => [
        r.id,
        r.orderNumber,
        `"${r.customerName.replace(/"/g, '""')}"`,
        r.sku,
        `"${r.productName.replace(/"/g, '""')}"`,
        r.qty,
        r.unitPrice,
        `"${r.reason.replace(/"/g, '""')}"`,
        `"${r.status}"`,
        r.warehouseId,
        r.locationBin,
        r.costs.freight,
        r.costs.inspectionFee,
        r.costs.repair,
        r.costs.assetLoss,
        getTotalRequestCost(r),
      ]);

      const csvContent =
        '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `routex-returns-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addNotification(
        `${verifiedUser.name} (${verifiedUser.employeeId}) ส่งออกรายงาน CSV`,
        'info'
      );
      showToast('ส่งออกไฟล์รายงาน CSV สำเร็จ');
    });
  };

  if (!currentUser) {
    return (
      <AuthPortal
        siteConfig={siteConfig}
        onStaffLogin={handleStaffLogin}
        onCustomerEnter={handleCustomerEnter}
      />
    );
  }

  const activeRole = currentUser.role;
  const navItems = ROLE_NAV_MAP[activeRole].filter(
    (item) => !item.requireLevel1 || currentUser.level === 1
  );
  const selectedRequest =
    requests.find((r) => r.id === selectedRequestId) || requests[0] || null;
  const activeNavLabel =
    navItems.find((item) => item.id === activeTab)?.label || 'Workspace';

  const visibleCustomDetails = siteConfig.customDetails.filter(
    (d) =>
      d.placement === 'all' ||
      (d.placement === 'customer' && activeRole === 'Customer')
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar: Clean 3-Zone Contract */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="เปิดหรือปิดเมนูด้านข้าง"
              className="md:hidden text-slate-300 hover:text-white p-1.5 rounded-lg cursor-pointer"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <button
              type="button"
              onClick={() => enterWorkspaceForRole(activeRole)}
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Truck size={17} aria-hidden="true" />
              </span>
              <span>{siteConfig.brandName}</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400 truncate">
            <span className="text-slate-200 font-medium whitespace-nowrap">
              {currentUser.name}
            </span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">
              {activeRole}
              {currentUser.employeeId ? ` (${currentUser.employeeId})` : ''}
            </span>
            <span aria-hidden="true">/</span>
            <span className="truncate">{activeNavLabel}</span>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut size={14} aria-hidden="true" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } md:block w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0`}
        >
          <div className="p-4 space-y-6">
            <div>
              <p className="px-3 mb-2 text-xs font-medium text-slate-400">
                เมนูการใช้งาน · {activeRole}
              </p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon size={17} className="shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 px-3 space-y-2 text-xs text-slate-400">
              <p className="font-medium text-slate-300">บัญชีผู้ใช้งาน</p>
              <p className="text-slate-200 font-medium truncate">{currentUser.name}</p>
              {currentUser.employeeId && (
                <div className="flex justify-between font-mono tabular-nums">
                  <span>รหัสพนักงาน</span>
                  <span className="text-slate-200">{currentUser.employeeId}</span>
                </div>
              )}
              <div className="flex justify-between font-mono tabular-nums">
                <span>คำร้องในระบบ</span>
                <span className="text-slate-200">{requests.length}</span>
              </div>
              {activeRole === 'Admin' && (
                <div className="flex justify-between font-mono tabular-nums">
                  <span>พนักงานทั้งหมด</span>
                  <span className="text-slate-200">{users.length}</span>
                </div>
              )}
            </div>

            {activeRole === 'Customer' && (
              <div className="pt-4 border-t border-slate-800 px-3 space-y-2 text-xs">
                <p className="font-medium text-slate-300">ติดต่อผู้ดูแลระบบ</p>
                <p className="text-slate-400">
                  LINE ID:{' '}
                  <span className="font-mono font-semibold text-emerald-400">
                    {siteConfig.supportLineId}
                  </span>
                </p>
                <p className="text-slate-400">
                  เบอร์ติดต่อ:{' '}
                  <a
                    href={`tel:${siteConfig.supportPhone}`}
                    className="font-mono font-semibold text-emerald-400 hover:underline"
                  >
                    {siteConfig.supportPhone}
                  </a>
                </p>
                {siteConfig.supportNote && (
                  <p className="text-slate-400 leading-relaxed">{siteConfig.supportNote}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(siteConfig.supportLineId);
                    showToast(`คัดลอก LINE ID: ${siteConfig.supportLineId} เรียบร้อยแล้ว`);
                  }}
                  className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  คัดลอก LINE ID
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
          {/* Custom Details / Announcements added by Admin Level 1 */}
          {visibleCustomDetails.length > 0 && activeTab !== 'site-settings' && (
            <div className="space-y-3">
              {visibleCustomDetails.map((detail) => (
                <div
                  key={detail.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-1"
                >
                  <h2 className="text-sm font-semibold text-slate-900">{detail.title}</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {detail.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Role Access Guard */}
          {activeRole === 'Customer' &&
            (activeTab === 'dashboard' ||
              activeTab === 'costs' ||
              activeTab === 'user-management' ||
              activeTab === 'site-settings') && (
              <div className="bg-white p-8 rounded-xl border border-rose-200 text-center space-y-4">
                <AlertTriangle size={40} className="mx-auto text-rose-500" aria-hidden="true" />
                <h2 className="text-xl font-bold text-slate-900">
                  ไม่มีสิทธิ์เข้าถึงข้อมูลภาพรวมองค์กร
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  บัญชีประเภทลูกค้าสามารถใช้งานเฉพาะหน้ายื่นคำขอคืนสินค้าและติดตามสถานะพัสดุคืนเท่านั้น
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new-request')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer"
                >
                  ไปที่หน้ายื่นคำขอคืนสินค้า
                </button>
              </div>
            )}

          {activeTab === 'dashboard' && activeRole === 'Admin' && (
            <DashboardView
              requests={requests}
              notifications={notifications}
              onExportCSV={handleExportCSV}
              onSelectRequest={(req, targetTab) => {
                setSelectedRequestId(req.id);
                if (targetTab) setActiveTab(targetTab);
              }}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'requests' && (
            <RequestsView
              requests={requests}
              activeRole={activeRole}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              onUpdateStatus={handleUpdateStatus}
              onInspectDetails={(req) => setModalRequest(req)}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'new-request' && (
            <NewRequestView
              products={products}
              returnReasons={returnReasons}
              siteConfig={siteConfig}
              onSubmitRequest={handleCreateRequest}
            />
          )}

          {activeTab === 'tracking' && (
            <TrackingView
              requests={requests}
              selectedRequest={selectedRequest}
              onSelectRequest={(req) => setSelectedRequestId(req.id)}
              activeRole={activeRole}
              siteConfig={siteConfig}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {activeTab === 'warehouse' &&
            (activeRole === 'Admin' || activeRole === 'Warehouse Staff') && (
              <WarehouseView
                requests={requests}
                warehouses={warehouses}
                onReceiveWarehouse={handleReceiveWarehouse}
                onDispatchToCustomer={handleDispatchToCustomer}
              />
            )}

          {activeTab === 'inspection' &&
            (activeRole === 'Admin' || activeRole === 'Inspector') && (
              <InspectionView
                requests={requests}
                onCompleteInspection={handleCompleteInspection}
              />
            )}

          {activeTab === 'costs' && activeRole === 'Admin' && (
            <CostManagementView
              requests={requests}
              onUpdateCost={handleUpdateCost}
              onExportCSV={handleExportCSV}
            />
          )}

          {activeTab === 'user-management' &&
            activeRole === 'Admin' &&
            currentUser.level === 1 && (
              <UserManagementView
                users={users}
                onCreateUser={handleCreateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}

          {activeTab === 'site-settings' &&
            activeRole === 'Admin' &&
            currentUser.level === 1 && (
              <SiteSettingsView
                key={`${siteConfig.brandName}-${siteConfig.supportLineId}-${siteConfig.customDetails.length}`}
                siteConfig={siteConfig}
                products={products}
                returnReasons={returnReasons}
                onSaveSiteConfig={handleSaveSiteConfig}
                onResetSiteConfig={handleResetSiteConfig}
                onAddProduct={handleAddProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateReturnReasons={handleUpdateReturnReasons}
              />
            )}
        </main>
      </div>

      {/* Staff Identity Verification Modal */}
      {pendingVerify && (
        <StaffVerifyModal
          actionLabel={pendingVerify.actionLabel}
          currentUser={currentUser}
          users={users}
          onCancel={() => setPendingVerify(null)}
          onVerified={(verifiedUser) => {
            const confirmFn = pendingVerify.onConfirm;
            setPendingVerify(null);
            confirmFn(verifiedUser);
          }}
        />
      )}

      {/* Request Detail Modal */}
      {modalRequest && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 id="modal-title" className="text-lg font-bold font-mono text-slate-900">
                  {modalRequest.id}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  คำสั่งซื้อ {modalRequest.orderNumber} · ยื่นคำร้อง {modalRequest.requestDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRequest(null)}
                aria-label="ปิดหน้าต่างรายละเอียด"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="aspect-[4/3] sm:aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <ResilientImage src={modalRequest.imageUrl} alt={modalRequest.productName} />
              </div>
              <div className="sm:col-span-2 space-y-3 text-sm">
                <StatusIndicator status={modalRequest.status} />
                <div>
                  <p className="font-semibold text-slate-900">{modalRequest.productName}</p>
                  <p className="text-xs font-mono text-slate-500">
                    {modalRequest.sku} · จำนวน {modalRequest.qty} ชิ้น ·{' '}
                    {formatCurrency(modalRequest.unitPrice * modalRequest.qty)}
                  </p>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    <span className="font-medium text-slate-800">ลูกค้า:</span>{' '}
                    {modalRequest.customerName} ({modalRequest.customerPhone})
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">สาเหตุ:</span>{' '}
                    {modalRequest.reason}
                  </p>
                  <p className="leading-relaxed">{modalRequest.detail}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs font-mono text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>คลัง: {modalRequest.warehouseId}</span>
                  <span>Bin: {modalRequest.locationBin}</span>
                  <span>ต้นทุนรวม: {formatCurrency(getTotalRequestCost(modalRequest))}</span>
                </div>
              </div>
            </div>

            {modalRequest.resolution && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="font-semibold text-slate-900">
                  ความประสงค์ของลูกค้า:{' '}
                  {modalRequest.resolution.type === 'reship'
                    ? 'ต้องการจัดส่งสินค้าให้ใหม่'
                    : 'ต้องการขอรับเงินคืน'}
                </p>
                {modalRequest.resolution.type === 'reship' ? (
                  <p className="text-slate-600">
                    ผู้รับ: {modalRequest.resolution.reshipName} · โทร{' '}
                    <span className="font-mono">{modalRequest.resolution.reshipPhone}</span>
                    <br />
                    ที่อยู่จัดส่ง: {modalRequest.resolution.reshipAddress}
                  </p>
                ) : (
                  <p className="text-slate-600">
                    {modalRequest.resolution.refundBankName} · ชื่อบัญชี:{' '}
                    {modalRequest.resolution.refundAccountName} · เลขบัญชี:{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {modalRequest.resolution.refundAccountNumber}
                    </span>
                  </p>
                )}
              </div>
            )}

            {modalRequest.outboundDispatch && (
              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs space-y-1">
                <p className="font-semibold text-blue-900">
                  ข้อมูลการจัดส่งพัสดุถึงลูกค้า ({modalRequest.outboundDispatch.carrier})
                </p>
                <p className="text-slate-700">
                  เลขที่พัสดุ:{' '}
                  <span className="font-mono font-bold text-blue-800">
                    {modalRequest.outboundDispatch.trackingNumber}
                  </span>{' '}
                  · สินค้า: <span className="font-semibold">{modalRequest.outboundDispatch.productName}</span>
                </p>
                <p className="text-slate-500 font-mono">
                  จัดส่งเมื่อ {modalRequest.outboundDispatch.shippedAt} โดย{' '}
                  {modalRequest.outboundDispatch.shippedBy}
                </p>
              </div>
            )}

            {modalRequest.timeline.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-800">ประวัติการดำเนินการ</p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50/60">
                  {modalRequest.timeline.map((t, i) => (
                    <div key={i} className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-medium text-slate-900">{t.status}</span>
                        <span className="text-slate-500 ml-2">โดย {t.actor} — {t.note}</span>
                      </div>
                      <span className="font-mono text-slate-500 shrink-0">{t.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-slate-100">
              {activeRole === 'Admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequestId(modalRequest.id);
                    setActiveTab('tracking');
                    setModalRequest(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  ติดตามสถานะ 7 ขั้นตอน
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 transition-opacity ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-slate-900 text-slate-100 border-slate-700'
          }`}
        >
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
         }
